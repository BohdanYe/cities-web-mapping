from django.test import TestCase, Client
from django.contrib.staticfiles import finders


class MapViewTests(TestCase):

    def setUp(self):
        self.client = Client()

    def test_map_view_loads(self):
        """Test that the map page loads successfully"""
        response = self.client.get('/map/')

        self.assertEqual(response.status_code, 200)
        self.assertIn('Leaflet', response.content.decode())

    def test_static_files_served(self):
        """Test that required static files can be found by Django"""

        map_js = finders.find('js/map.js')
        styles_css = finders.find('css/styles.css')

        self.assertIsNotNone(
            map_js,
            'Django could not find static/js/map.js'
        )

        self.assertIsNotNone(
            styles_css,
            'Django could not find static/css/styles.css'
        )