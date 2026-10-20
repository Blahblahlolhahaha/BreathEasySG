"""Accuracy checks for great-circle distances on a 6,371 km sphere.

Run from the repository root:
    psi/.venv/bin/python -m unittest discover -s psi/tests -p 'test_*.py' -v

Expected values use exact spherical geometry or independently calculated
Cartesian unit vectors: R * atan2(|u cross v|, u dot v). They do not use
ellipsoidal/WGS84 distances or duplicate the production haversine formula.
"""

import math
import unittest

from psi.main import Coords, calculate_distance


EARTH_RADIUS_KM = 6371.0
# One millimetre in kilometres; accommodates floating-point rounding while
# catching even a misplaced half-angle at Singapore distances.
TOLERANCE_KM = 1e-6


class CalculateDistanceTests(unittest.TestCase):
    def assert_distance(self, first, second, expected_km):
        first = Coords(latitude=first[0], longitude=first[1])
        second = Coords(latitude=second[0], longitude=second[1])
        for start, end in ((first, second), (second, first)):
            with self.subTest(start=start, end=end):
                actual = calculate_distance(start, end)
                self.assertTrue(math.isfinite(actual))
                self.assertGreaterEqual(actual, 0.0)
                self.assertLessEqual(actual, math.pi * EARTH_RADIUS_KM)
                self.assertAlmostEqual(actual, expected_km, delta=TOLERANCE_KM)

    def test_identical_coordinates_have_zero_distance(self):
        for point in ((0, 0), (1.3521, 103.8198), (-33.8688, 151.2093)):
            with self.subTest(point=point):
                self.assert_distance(point, point, 0.0)

    def test_one_degree_along_equator_is_in_kilometres(self):
        self.assert_distance((0, 0), (0, 1), EARTH_RADIUS_KM * math.pi / 180)

    def test_one_degree_along_meridian(self):
        self.assert_distance((10, 103), (11, 103), EARTH_RADIUS_KM * math.pi / 180)

    def test_quarter_equator(self):
        self.assert_distance((0, 0), (0, 90), EARTH_RADIUS_KM * math.pi / 2)

    def test_equator_to_north_pole(self):
        self.assert_distance((0, 0), (90, 0), EARTH_RADIUS_KM * math.pi / 2)

    def test_opposite_poles(self):
        self.assert_distance((-90, 0), (90, 0), EARTH_RADIUS_KM * math.pi)

    def test_antipodal_points_on_equator(self):
        self.assert_distance((0, 0), (0, 180), EARTH_RADIUS_KM * math.pi)

    def test_crossing_equator_in_both_hemispheres(self):
        self.assert_distance((-30, -70), (30, -70), EARTH_RADIUS_KM * math.pi / 3)

    def test_date_line_crossing_takes_shorter_arc(self):
        self.assert_distance((0, 179), (0, -179), EARTH_RADIUS_KM * math.pi / 90)

    def test_positive_and_negative_180_are_same_longitude(self):
        self.assert_distance((25, 180), (25, -180), 0.0)

    def test_longitude_does_not_change_location_at_poles(self):
        for latitude in (-90, 90):
            with self.subTest(latitude=latitude):
                self.assert_distance((latitude, -40), (latitude, 123), 0.0)

    def test_high_latitude_distance(self):
        # These opposite longitudes are connected through the north pole:
        # 30 degrees to the pole plus 30 degrees back down.
        self.assert_distance((60, 0), (60, 180), EARTH_RADIUS_KM * math.pi / 3)

    def test_very_close_coordinates(self):
        self.assert_distance((0, 0), (0, 0.000001), EARTH_RADIUS_KM * math.pi / 180_000_000)

    def test_singapore_scale_distance(self):
        # Independent Cartesian-vector reference (see module docstring).
        self.assert_distance((1.3521, 103.8198), (1.3644, 103.9915), 19.13574410211299)

    def test_london_to_new_york(self):
        # Independent Cartesian-vector reference (see module docstring).
        self.assert_distance((51.5074, -0.1278), (40.7128, -74.0060), 5570.222179737958)


if __name__ == "__main__":
    unittest.main()
