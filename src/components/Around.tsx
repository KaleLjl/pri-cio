'use client';

import { useState, useEffect } from 'react';

const GOOGLE_MAP_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY;

// Extend the global window object to include custom properties
declare global {
  interface Window {
    google: any; // Declare the Google Maps object
    initMap: () => void; // Declare the initMap function
  }
}

const Around = () => {
  const [isNight, setIsNight] = useState(false);
  const [map, setMap] = useState<any>(null);

  // Determine if it is day or night based on the current time
  useEffect(() => {
    const hours = new Date().getHours();
    setIsNight(hours < 6 || hours >= 18); // Night time: before 6 AM or after 6 PM
  }, []);

  useEffect(() => {
    // Load Google Maps script
    const loadGoogleMapsScript = () => {
      if (document.getElementById('google-maps')) return;

      const script = document.createElement('script');
      script.id = 'google-maps';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAP_API_KEY}&callback=initMap`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log("Google Maps script loaded");
        if (window.initMap) {
          window.initMap();
        }
      };
      document.body.appendChild(script);
    };

    loadGoogleMapsScript();

    // Initialize the map when the script is loaded
    window.initMap = () => {
      console.log("Initializing Google Map...");
      const mapInstance = new window.google.maps.Map(document.getElementById('map') as HTMLElement, {
        center: { lat: -34.397, lng: 150.644 },
        zoom: 8,
      });
      setMap(mapInstance);

      // Add the Geolocation Control
      addGeolocationControl(mapInstance);
    };
  }, []);

  // Add Geolocation control to the map
  const addGeolocationControl = (mapInstance: any) => {
    // Create a control button
    const controlDiv = document.createElement('div');
    controlDiv.style.margin = '10px';
    controlDiv.style.padding = '0';
    controlDiv.style.backgroundColor = 'white';
    controlDiv.style.border = '1px solid #ccc';
    controlDiv.style.borderRadius = '8px';
    controlDiv.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
    controlDiv.style.cursor = 'pointer';
    controlDiv.style.width = '40px';
    controlDiv.style.height = '40px';
    controlDiv.style.display = 'flex';
    controlDiv.style.alignItems = 'center';
    controlDiv.style.justifyContent = 'center';

    // Add an icon inside the button
    const icon = document.createElement('div');
    icon.style.width = '24px';
    icon.style.height = '24px';
    icon.style.backgroundImage = 'url("https://img.icons8.com/ios-filled/50/000000/center-direction.png")';
    icon.style.backgroundSize = 'contain';
    icon.style.backgroundRepeat = 'no-repeat';
    controlDiv.appendChild(icon);

    // Click Event Listener for Geolocation
    controlDiv.addEventListener('click', () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            console.log('User Location:', userLocation);

            // Center the map on user's location
            mapInstance.setCenter(userLocation);

            // Add a marker with a human avatar icon
            new window.google.maps.Marker({
              position: userLocation,
              map: mapInstance,
              title: 'You are here',
              icon: {
                url: 'https://img.icons8.com/color/48/000000/person-male.png', // Human avatar icon
                scaledSize: new window.google.maps.Size(40, 40), // Adjust size
              },
            });
          },
          (error) => {
            console.error('Error fetching location:', error.message);
            alert('Could not fetch your location.');
          }
        );
      } else {
        alert('Geolocation is not supported by your browser.');
      }
    });

    // Add the control to the map
    mapInstance.controls[window.google.maps.ControlPosition.RIGHT_BOTTOM].push(controlDiv);
  };

  return (
    <div className={`min-h-screen flex flex-col ${isNight ? 'bg-black' : 'bg-gray-50'}`}>
      {/* Navigation Bar */}
      <nav
        className={`p-4 ${
          isNight ? 'bg-gray-900 text-white' : 'bg-white shadow-md text-black'
        }`}
        style={{ height: '60px', position: 'fixed', width: '100%', zIndex: 10 }}
      >
        <h1>Navigation Bar</h1>
      </nav>

      {/* Main Content */}
      <div
        id="map"
        style={{
          height: 'calc(100vh - 60px)', // Subtract the height of the navigation bar
          marginTop: '60px', // Push the map below the navigation bar
          width: '100vw', // Full width
        }}
      ></div>
    </div>
  );
};

export default Around;
