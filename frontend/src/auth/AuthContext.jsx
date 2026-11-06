// Keeps track of whether the user is logged in, using Amazon Cognito (sign up, confirm email, log in, log out).
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
} from "amazon-cognito-identity-js";

const poolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
const userPool =
  poolId && clientId
    ? new CognitoUserPool({ UserPoolId: poolId, ClientId: clientId })
    : null;

const NOT_CONFIGURED =
  "Login is not set up yet. Check the Cognito values in .env.local.";
const AuthContext = createContext(null);

const cleanEmail = (email) => email.trim().toLowerCase();

function makeUser(email) {
  if (!userPool) throw new Error(NOT_CONFIGURED);
  return new CognitoUser({ Username: cleanEmail(email), Pool: userPool });
}

// Returns the saved session (Cognito refreshes it if needed), or null if nobody is signed in.
function loadSession() {
  return new Promise((resolve) => {
    const current = userPool?.getCurrentUser();
    if (!current) return resolve(null);
    current.getSession((err, session) => {
      resolve(err || !session || !session.isValid() ? null : session);
    });
  });
}

function userFromSession(session) {
  const p = session.getIdToken().payload;
  return { id: p.sub, name: p.name || "", email: p.email || "" };
}

// `loading` stays true while we check for a saved session, so a page refresh doesn't bounce to /login.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadSession().then((session) => {
      if (cancelled) return;
      setUser(session ? userFromSession(session) : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(user),
      loading,
      user,

      signUp: (name, email, password) =>
        new Promise((resolve, reject) => {
          if (!userPool) return reject(new Error(NOT_CONFIGURED));
          const attributes = [
            new CognitoUserAttribute({ Name: "name", Value: name.trim() }),
            new CognitoUserAttribute({
              Name: "email",
              Value: cleanEmail(email),
            }),
          ];
          userPool.signUp(
            cleanEmail(email),
            password,
            attributes,
            null,
            (err) => (err ? reject(err) : resolve()),
          );
        }),

      confirmSignUp: (email, code) =>
        new Promise((resolve, reject) => {
          makeUser(email).confirmRegistration(code.trim(), true, (err) =>
            err ? reject(err) : resolve(),
          );
        }),

      resendCode: (email) =>
        new Promise((resolve, reject) => {
          makeUser(email).resendConfirmationCode((err) =>
            err ? reject(err) : resolve(),
          );
        }),

      signIn: (email, password) =>
        new Promise((resolve, reject) => {
          const cognitoUser = makeUser(email);

          const details = new AuthenticationDetails({
            Username: cleanEmail(email),
            Password: password,
          });

          cognitoUser.authenticateUser(details, {
            onSuccess: (session) => {
              setUser(userFromSession(session));
              resolve({ status: "SUCCESS" });
            },
            onFailure: reject,
            newPasswordRequired: () => {
              resolve({
                status: "NEW_PASSWORD_REQUIRED",
                cognitoUser,
              });
            },
          });
        }),

      completeNewPassword: (cognitoUser, newPassword, name) =>
        new Promise((resolve, reject) => {
          cognitoUser.completeNewPasswordChallenge(
            newPassword,
            {name: name.trim()},
            {
              onSuccess: (session) => {
                setUser(userFromSession(session));
                resolve();
              },
              onFailure: reject,
            },
          );
        }),

      signOut: () => {
        userPool?.getCurrentUser()?.signOut();
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

// The current Cognito ID token (or null when signed out). src/api/client.js sends it as the Bearer token.
export async function getIdToken() {
  const session = await loadSession();
  return session ? session.getIdToken().getJwtToken() : null;
}
