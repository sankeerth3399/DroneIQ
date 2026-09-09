import { useEffect, useRef } from "react";

const MapSearch = ({ onPlaceSelect }) => {
  const searchRef = useRef(null);

  useEffect(() => {
    if (!window.mappls) {
      console.error("Mappls SDK not loaded");
      return;
    }

    if (!window.mappls.search) {
      console.error("Mappls Search Plugin not loaded");
      return;
    }

    const placeOptions = {
      location: [17.385, 78.4867],

      // Search only cities
      // pod: "City",

      // Other options:
      // geolocation: true,
      // bridge: true,
      // tokenizeAddress: true,
      // filter: "cop:9QGXAM",
      // hyperLocal: true,
      // distance: true,

      width: 300,
      height: 300,

      clearButton: true,

      blank_callback: () => {
        console.log("Search cleared");
      },
    };

    const callback = (data) => {
      console.log("Selected location:", data);

      if (onPlaceSelect) {
        onPlaceSelect(data);
      }
    };

    searchRef.current = new window.mappls.search(
      document.getElementById("mappls-search"),
      placeOptions,
      callback
    );

    return () => {
      searchRef.current = null;
    };
  }, [onPlaceSelect]);

  return (
    <div
      id="mappls-search"
      className="absolute left-4 top-4 z-50"
    />
  );
};

export default MapSearch;