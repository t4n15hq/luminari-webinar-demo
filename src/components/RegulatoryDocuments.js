import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps';
import { geoCentroid } from 'd3-geo';
import AskLuminaPopup from './common/AskLuminaPopup';
import FloatingButton from './common/FloatingButton';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const regionCountryMap = {
  'north-america': ["United States", "Canada", "Mexico"],
  'europe': ["United Kingdom", "France", "Germany", "Italy", "Spain", "Switzerland", "Russia", "European Union"],
  'asia-pacific': ["Japan", "China", "South Korea", "Australia", "Singapore", "India", "Taiwan"],
  'latin-america': ["Brazil", "Argentina", "Colombia", "Chile", "Peru", "Mexico"],
  'africa-middle-east': ["South Africa", "Israel", "Saudi Arabia", "United Arab Emirates", "Egypt", "Nigeria"]
};

const regionColors = {
  'north-america': '#4299e1',
  'europe': '#48bb78',
  'asia-pacific': '#ed8936',
  'latin-america': '#9f7aea',
  'africa-middle-east': '#e53e3e'
};

const regionNameMap = {
  'north-america': 'North America',
  'europe': 'Europe',
  'asia-pacific': 'Asia Pacific',
  'latin-america': 'Latin America',
  'africa-middle-east': 'Africa & Middle East'
};

// Add centroid coordinates for each supported region
const regionCentroids = {
  'north-america': [-100, 45],
  'europe': [15, 50],
  'asia-pacific': [110, 20],
  'latin-america': [-60, -15],
  'africa-middle-east': [30, 10]
};

const InteractiveRegulatoryMap = ({ onCountrySelect }) => {
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [showAskLumina, setShowAskLumina] = useState(false);

  // Comprehensive regional data with regulatory documentation for each country
  const regions = {
    "north-america": {
      name: "North America",
      countries: [
        { 
          id: "usa", 
          name: "United States", 
          documents: [
            { id: "ind", name: "IND (Investigational New Drug)", purpose: "To begin clinical trials (Phases I-III)" },
            { id: "nda", name: "NDA (New Drug Application)", purpose: "To request approval for marketing a new drug" },
            { id: "bla", name: "BLA (Biologics License Application)", purpose: "For biologics approval under the Public Health Service Act" }
          ], 
          coords: { x: 150, y: 100 } 
        },
        { 
          id: "canada", 
          name: "Canada", 
          documents: [
            { id: "cta_ca", name: "Clinical Trial Application (Health Canada)", purpose: "To authorize clinical trials in Canada" },
            { id: "nds", name: "New Drug Submission (NDS)", purpose: "For drug approval in Canada" },
            { id: "noc", name: "Notice of Compliance (NOC)", purpose: "Canadian marketing authorization" }
          ], 
          coords: { x: 200, y: 80 } 
        },
        { 
          id: "mexico", 
          name: "Mexico", 
          documents: [
            { id: "cofepris_cta", name: "COFEPRIS Clinical Trial Authorization", purpose: "Mexican clinical trial approval" },
            { id: "cofepris_nda", name: "COFEPRIS New Drug Registration", purpose: "Mexican marketing authorization" }
          ], 
          coords: { x: 120, y: 140 } 
        }
      ],
      color: "#4299e1",
      coords: { x: 180, y: 120 }
    },
    "europe": {
      name: "Europe", 
      countries: [
        { 
          id: "eu", 
          name: "European Union", 
          documents: [
            { id: "cta_eu", name: "CTA (Clinical Trial Application)", purpose: "To authorize clinical trials via CTIS" },
            { id: "maa", name: "MAA (Marketing Authorization Application)", purpose: "To request EU-wide marketing approval" },
            { id: "impd", name: "IMPD (Investigational Medicinal Product Dossier)", purpose: "Quality, manufacturing and control information" }
          ], 
          coords: { x: 480, y: 110 } 
        },
        { 
          id: "uk", 
          name: "United Kingdom", 
          documents: [
            { id: "cta_uk", name: "Clinical Trial Authorisation (UK)", purpose: "MHRA clinical trial approval post-Brexit" },
            { id: "ma_uk", name: "Marketing Authorisation (UK)", purpose: "MHRA marketing approval" },
            { id: "vie", name: "Voluntary Scheme for Branded Medicines Pricing", purpose: "UK pricing and access" }
          ], 
          coords: { x: 440, y: 95 } 
        },
        { 
          id: "switzerland", 
          name: "Switzerland", 
          documents: [
            { id: "cta_ch", name: "Clinical Trial Authorisation (Swissmedic)", purpose: "Swiss clinical trial approval" },
            { id: "ma_ch", name: "Marketing Authorisation (Switzerland)", purpose: "Swissmedic drug approval" }
          ], 
          coords: { x: 485, y: 105 } 
        },
        { 
          id: "russia", 
          name: "Russia", 
          documents: [
            { id: "cta_ru", name: "Clinical Trial Permit (Roszdravnadzor)", purpose: "Russian clinical trial authorization" },
            { id: "rd_ru", name: "Registration Dossier (Russia)", purpose: "Russian drug registration with Roszdravnadzor" },
            { id: "gmp_ru", name: "Russian GMP Certificate", purpose: "Manufacturing authorization in Russia" }
          ], 
          coords: { x: 580, y: 90 } 
        }
      ],
      color: "#48bb78",
      coords: { x: 500, y: 110 }
    },
    "asia-pacific": {
      name: "Asia Pacific",
      countries: [
        { 
          id: "japan", 
          name: "Japan", 
          documents: [
            { id: "ctn_jp", name: "Clinical Trial Notification (CTN)", purpose: "Submitted to PMDA before clinical trials" },
            { id: "jnda", name: "J-NDA (New Drug Application)", purpose: "Submitted to PMDA/MHLW for approval" },
            { id: "pmda_consultation", name: "PMDA Scientific Advice", purpose: "Regulatory guidance consultation" }
          ], 
          coords: { x: 720, y: 110 } 
        },
        { 
          id: "china", 
          name: "China", 
          documents: [
            { id: "ind_ch", name: "IND (China)", purpose: "Required before clinical trials (submitted to NMPA)" },
            { id: "nda_ch", name: "NDA (China)", purpose: "Required for marketing approval with NMPA" },
            { id: "drug_license_ch", name: "Drug Registration Certificate", purpose: "Chinese drug license for commercialization" }
          ], 
          coords: { x: 680, y: 120 } 
        },
        { 
          id: "south-korea", 
          name: "South Korea", 
          documents: [
            { id: "ind_kr", name: "IND (Korea)", purpose: "Korean clinical trial application to MFDS" },
            { id: "nda_kr", name: "NDA (Korea)", purpose: "New drug application to MFDS" },
            { id: "kgmp", name: "Korean GMP Certificate", purpose: "Manufacturing authorization" }
          ], 
          coords: { x: 710, y: 115 } 
        },
        { 
          id: "australia", 
          name: "Australia", 
          documents: [
            { id: "ctn_au", name: "CTN (Clinical Trial Notification)", purpose: "TGA notification scheme for clinical trials" },
            { id: "aus", name: "AUS (Australian Submission)", purpose: "Submission to TGA for ARTG registration" },
            { id: "tga_gmp", name: "TGA GMP Certificate", purpose: "Australian manufacturing license" }
          ], 
          coords: { x: 750, y: 220 } 
        },
        { 
          id: "singapore", 
          name: "Singapore", 
          documents: [
            { id: "cta_sg", name: "Clinical Trial Certificate (HSA)", purpose: "Singapore clinical trial approval" },
            { id: "product_license_sg", name: "Product License (Singapore)", purpose: "HSA marketing authorization" }
          ], 
          coords: { x: 670, y: 170 } 
        },
        { 
          id: "india", 
          name: "India", 
          documents: [
            { id: "cta_in", name: "Clinical Trial Permission (CDSCO)", purpose: "Indian clinical trial approval" },
            { id: "nda_in", name: "New Drug Application (India)", purpose: "CDSCO marketing approval" },
            { id: "import_license_in", name: "Import License", purpose: "Drug import authorization" }
          ], 
          coords: { x: 620, y: 150 } 
        },
        { 
          id: "taiwan", 
          name: "Taiwan", 
          documents: [
            { id: "ind_tw", name: "IND (Taiwan)", purpose: "TFDA clinical trial application" },
            { id: "nda_tw", name: "NDA (Taiwan)", purpose: "TFDA new drug approval" }
          ], 
          coords: { x: 705, y: 130 } 
        }
      ],
      color: "#ed8936",
      coords: { x: 680, y: 150 }
    },
    "latin-america": {
      name: "Latin America",
      countries: [
        { 
          id: "brazil", 
          name: "Brazil", 
          documents: [
            { id: "anvisa_cta", name: "ANVISA Clinical Trial Authorization", purpose: "Brazilian clinical trial approval" },
            { id: "anvisa_nda", name: "ANVISA Registration Dossier", purpose: "Brazilian drug registration" },
            { id: "anvisa_gmp", name: "ANVISA GMP Certificate", purpose: "Brazilian manufacturing authorization" }
          ], 
          coords: { x: 280, y: 190 } 
        },
        { 
          id: "argentina", 
          name: "Argentina", 
          documents: [
            { id: "anmat_cta", name: "ANMAT Clinical Trial Authorization", purpose: "Argentine clinical trial approval" },
            { id: "anmat_nda", name: "ANMAT Drug Registration", purpose: "Argentine marketing authorization" }
          ], 
          coords: { x: 260, y: 240 } 
        },
        { 
          id: "colombia", 
          name: "Colombia", 
          documents: [
            { id: "invima_cta", name: "INVIMA Clinical Trial Permit", purpose: "Colombian clinical trial authorization" },
            { id: "invima_nda", name: "INVIMA Drug Registration", purpose: "Colombian marketing approval" }
          ], 
          coords: { x: 220, y: 170 } 
        },
        { 
          id: "chile", 
          name: "Chile", 
          documents: [
            { id: "isp_cta", name: "ISP Clinical Trial Authorization", purpose: "Chilean clinical trial approval" },
            { id: "isp_nda", name: "ISP Drug Registration", purpose: "Chilean marketing authorization" }
          ], 
          coords: { x: 240, y: 250 } 
        }
      ],
      color: "#9f7aea",
      coords: { x: 250, y: 200 }
    },
    "africa-middle-east": {
      name: "Africa & Middle East",
      countries: [
        { 
          id: "south-africa", 
          name: "South Africa", 
          documents: [
            { id: "sahpra_cta", name: "SAHPRA Clinical Trial Authorization", purpose: "South African clinical trial approval" },
            { id: "sahpra_nda", name: "SAHPRA Medicine Registration", purpose: "South African marketing authorization" }
          ], 
          coords: { x: 520, y: 230 } 
        },
        { 
          id: "israel", 
          name: "Israel", 
          documents: [
            { id: "moh_israel_cta", name: "Israeli MOH Clinical Trial Permit", purpose: "Israeli clinical trial approval" },
            { id: "moh_israel_nda", name: "Israeli Drug Registration", purpose: "Israeli marketing authorization" }
          ], 
          coords: { x: 510, y: 140 } 
        },
        { 
          id: "saudi-arabia", 
          name: "Saudi Arabia", 
          documents: [
            { id: "sfda_cta", name: "SFDA Clinical Trial Authorization", purpose: "Saudi clinical trial approval" },
            { id: "sfda_nda", name: "SFDA Drug Registration", purpose: "Saudi marketing authorization" }
          ], 
          coords: { x: 540, y: 150 } 
        },
        { 
          id: "uae", 
          name: "United Arab Emirates", 
          documents: [
            { id: "dha_cta", name: "DHA Clinical Trial Permit", purpose: "UAE clinical trial approval" },
            { id: "moh_uae_nda", name: "UAE Drug Registration", purpose: "UAE marketing authorization" }
          ], 
          coords: { x: 560, y: 155 } 
        }
      ],
      color: "#e53e3e",
      coords: { x: 530, y: 170 }
    }
  };

  // Helper to get region by country name
  const getRegionByCountry = (countryName) => {
    for (const [region, countries] of Object.entries(regionCountryMap)) {
      if (countries.includes(countryName)) return region;
    }
    return null;
  };

  const handleRegionClick = (regionId) => {
    setSelectedRegion(selectedRegion === regionId ? null : regionId);
  };

  const handleCountrySelect = (country, region) => {
    onCountrySelect({
      country: country.name,
      countryId: country.id,
      region: regions[region].name,
      availableDocuments: country.documents
    });
  };

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '0', padding: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.07)', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
      {/* Ask Lumina Popup */}
      <AskLuminaPopup 
        isOpen={showAskLumina}
        onClose={() => setShowAskLumina(false)}
        contextData="Regulatory Documents - Global Market Requirements"
      />

      {/* Professional Ask Lumina Floating Button */}
      <FloatingButton
        onClick={() => setShowAskLumina(true)}
        icon="AI"
        label="Ask Lumina™"
        variant="primary"
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ textAlign: 'left', marginBottom: '10px', color: '#2d3748', margin: 0 }}>
            Global Regulatory Document Map
          </h2>
          <p style={{ textAlign: 'left', color: '#4a5568', margin: '0.5rem 0 0 0' }}>
            Select a region to explore available regulatory documents by country
          </p>
        </div>
        <a 
          href="/batch-regulatory" 
          className="btn btn-outline"
          style={{ textDecoration: 'none' }}
        >
          Batch Generator
        </a>
      </div>
      
      <div style={{ position: 'relative', width: '100%', height: '400px', margin: '20px 0' }}>
        <ComposableMap projection="geoMercator" width={900} height={400} style={{ width: '100%', height: '400px' }}>
          <ZoomableGroup center={[20, 20]} zoom={1}>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map(geo => {
                  const countryName = geo.properties.NAME;
                  const region = getRegionByCountry(countryName);
                  const isRegion = selectedRegion ? region === selectedRegion : false;
                  const isRegionMain = Object.keys(regionCountryMap).some(r => regionCountryMap[r].includes(countryName) && r === selectedRegion);
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => {
                        if (!selectedRegion && region) {
                          setSelectedRegion(region);
                        }
                        // Removed direct navigation from map click
                        // Users should now click the country cards below to expand and then proceed
                      }}
                      style={{
                        default: {
                          fill: selectedRegion
                            ? (isRegion ? regionColors[selectedRegion] : '#e2e8f0')
                            : (region ? regionColors[region] : '#e2e8f0'),
                          stroke: '#fff',
                          strokeWidth: 0.75,
                          outline: 'none',
                          cursor: region ? 'pointer' : 'default',
                          opacity: selectedRegion ? (isRegion ? 1 : 0.5) : 0.85
                        },
                        hover: {
                          fill: region ? regionColors[region] : '#cbd5e0',
                          opacity: 1,
                          outline: 'none',
                          cursor: region ? 'pointer' : 'default'
                        },
                        pressed: {
                          fill: region ? regionColors[region] : '#cbd5e0',
                          outline: 'none',
                          cursor: region ? 'pointer' : 'default'
                        }
                      }}
                    />
                  );
                })
              }
            </Geographies>
            {/* Add clickable region dots */}
            {Object.entries(regionCentroids).map(([regionId, coords]) => (
              <Marker key={regionId} coordinates={coords}>
                <circle
                  r={selectedRegion === regionId ? 18 : 13}
                  fill={regionColors[regionId]}
                  stroke="#2d3748"
                  strokeWidth={selectedRegion === regionId ? 3 : 2}
                  opacity={hoveredRegion === regionId ? 0.85 : 0.7}
                  style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={() => setHoveredRegion(regionId)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  onClick={() => setSelectedRegion(regionId)}
                />
                <text
                  textAnchor="middle"
                  y={selectedRegion === regionId ? 35 : 28}
                  style={{
                    fontFamily: 'inherit',
                    fontSize: selectedRegion === regionId ? 15 : 13,
                    fontWeight: selectedRegion === regionId ? 'bold' : 'normal',
                    fill: '#2d3748',
                    cursor: 'pointer',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {regionNameMap[regionId]}
                </text>
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>
      </div>
      {/* Region Details */}
      {selectedRegion && (
        <div style={{
          backgroundColor: '#f8f9fa',
          borderRadius: '0',
          padding: '20px',
          marginTop: '20px',
          border: `2px solid ${regions[selectedRegion].color}`
        }}>
          <h3 style={{ 
            margin: '0 0 15px 0', 
            color: regions[selectedRegion].color,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            {regions[selectedRegion].name}
            <span style={{ 
              fontSize: '0.8rem', 
              background: regions[selectedRegion].color,
              color: 'white',
              padding: '2px 8px',
              borderRadius: '0'
            }}>
              {regions[selectedRegion].countries.length} countries
            </span>
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '15px'
          }}>
            {regions[selectedRegion].countries.map((country) => {
              return (
              <div
                key={country.id}
                style={{
                  padding: '15px',
                  backgroundColor: 'white',
                  borderRadius: '0',
                  border: `2px solid ${regions[selectedRegion].color}`,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '15px',
                  paddingBottom: '15px',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#2d3748', fontSize: '1.1rem', marginBottom: '4px' }}>
                      {country.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#4a5568' }}>
                      {country.documents.length} document type{country.documents.length !== 1 ? 's' : ''} available
                    </div>
                  </div>
                </div>

                {/* Available Documents List - Always shown */}
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#4a5568', marginBottom: '10px' }}>
                    Available Documents:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {country.documents.map((doc, idx) => (
                      <div
                        key={doc.id || idx}
                        style={{
                          fontSize: '0.8rem',
                          color: '#2d3748',
                          padding: '10px 12px',
                          backgroundColor: '#f7fafc',
                          borderRadius: '0',
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        <div style={{ fontWeight: '600', marginBottom: '4px', color: regions[selectedRegion].color }}>
                          • {doc.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#718096', marginLeft: '12px' }}>
                          {doc.purpose}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Proceed Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCountrySelect(country, selectedRegion);
                    }}
                    style={{
                      marginTop: '15px',
                      width: '100%',
                      padding: '12px',
                      backgroundColor: regions[selectedRegion].color,
                      color: 'white',
                      border: 'none',
                      borderRadius: '0',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9';
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    Proceed to Generate Documents →
                  </button>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        textAlign: 'center',
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#ebf8ff',
        borderRadius: '0',
        border: '1px solid #bee3f8'
      }}>
        <div style={{ fontSize: '0.9rem', color: '#2c5282' }}>
          <strong>How to use:</strong> Click on a region above to see available countries, 
          then click on a country to proceed to the regulatory document generator with pre-selected options.
        </div>
      </div>
    </div>
  );
};

const RegulatoryDocuments = () => {
  const navigate = useNavigate();

  const handleCountrySelection = (countryData) => {
    // Navigate to the regulatory document generator with selected country data
    navigate('/ind-modules', {
      state: {
        selectedCountry: countryData.country,
        selectedCountryId: countryData.countryId,
        selectedRegion: countryData.region,
        selectedDocuments: countryData.availableDocuments
      }
    });
  };

  return (
    <div className="regulatory-documents max-w-6xl mx-auto py-8 px-4">
      <InteractiveRegulatoryMap onCountrySelect={handleCountrySelection} />
    </div>
  );
};

export default RegulatoryDocuments;