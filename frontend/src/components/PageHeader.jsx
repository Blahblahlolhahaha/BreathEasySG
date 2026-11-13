// Page title row with optional extras on the right.
export function PageHeader({ title, children }) {
  return (
    <header className="page-head">
      <h1 className="page-title">{title}</h1>
      {children}
    </header>
  )
}
