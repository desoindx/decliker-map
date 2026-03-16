'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl, { GeoJSONSource } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import styles from './Map.module.css'
import Popup from './Popup'
import { Decliker } from '../../../types/decliker'
import Select, { Options } from 'react-select'
import { selectStyles } from './SelectStyles'

const Map = ({
  declikers,
  professions,
  withName,
  noFigures,
}: {
  declikers: Decliker[]
  professions: Options<{ label: string; value: string }>
  withName?: boolean
  noFigures?: boolean
}) => {
  const map = useRef<maplibregl.Map>(null)
  const mapContainer = useRef<HTMLDivElement>(null)
  const [selectedDeclikers, setSelectedDeclikers] = useState<Decliker[] | null>(null)

  useEffect(() => {
    if (map.current || !mapContainer.current) {
      return
    }

    map.current = new maplibregl.Map({
      attributionControl: false,
      container: mapContainer.current,
      style: 'https://openmaptiles.geo.data.gouv.fr/styles/osm-bright/style.json',
      minZoom: 2,
      maxZoom: 18,
      zoom: 5,
      center: {
        lat: 46,
        lon: 2,
      },
    })

    map.current.on('load', () => {
      if (!map.current) {
        return
      }

      try {
        const scaleControl = new maplibregl.ScaleControl({
          maxWidth: 100,
          unit: 'metric',
        })
        map.current.addControl(scaleControl, 'bottom-left')

        map.current.addSource('declikers', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: declikers.map((decliker) => ({
              type: 'Feature',
              properties: { name: decliker.name, id: decliker.id },
              geometry: decliker.geometry,
            })),
          },
          cluster: true,
          clusterRadius: 50,
          clusterProperties: {
            count: ['+', 1],
          },
        })

        map.current.addLayer({
          id: 'declikersCluster',
          source: 'declikers',
          type: 'circle',
          filter: ['==', 'cluster', true],
          paint: {
            'circle-color': '#f7c744',
            'circle-stroke-color': '#284f42',
            'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 1, 10, 50, 25],
            'circle-stroke-width': 2,
          },
        })

        map.current.addLayer({
          id: 'declikers',
          source: 'declikers',
          type: 'circle',
          filter: ['!=', 'cluster', true],
          paint: {
            'circle-color': '#f7c744',
            'circle-stroke-color': '#284f42',
            'circle-radius': 7,
            'circle-stroke-width': 2,
          },
        })

        {
          !noFigures &&
            map.current.addLayer({
              id: 'declikersClusterSymbol',
              source: 'declikers',
              type: 'symbol',
              filter: ['==', 'cluster', true],
              layout: {
                'text-field': ['get', 'count'],
                'text-size': 16,
                'text-allow-overlap': true,
                'text-font': ['Noto Sans Bold'],
              },
              paint: {
                'text-color': '#284f42',
              },
            })
        }

        if (withName) {
          map.current.on('mouseenter', 'declikers', () => {
            if (map.current) {
              map.current.getCanvas().style.cursor = 'pointer'
            }
          })
          map.current.on('mouseleave', 'declikers', () => {
            if (map.current) {
              map.current.getCanvas().style.cursor = ''
            }
          })
          map.current.on('click', 'declikers', (e) => {
            setSelectedDeclikers(e.features?.map((feature) => feature.properties as Decliker) || null)
          })

          map.current.on('mouseenter', 'declikersCluster', () => {
            if (map.current) {
              map.current.getCanvas().style.cursor = 'pointer'
            }
          })
          map.current.on('mouseleave', 'declikersCluster', () => {
            if (map.current) {
              map.current.getCanvas().style.cursor = ''
            }
          })
          map.current.on('click', 'declikersCluster', (e) => {
            if (map.current && e.features) {
              let clusterId = e.features[0].properties.cluster_id
              let pointCount = e.features[0].properties.point_count
              ;(map.current.getSource('declikers') as GeoJSONSource)
                .getClusterLeaves(clusterId, pointCount, 0)
                .then((features) => {
                  if (features) {
                    setSelectedDeclikers(features.map((feature) => feature.properties as Decliker) || null)
                  }
                })
            }
          })
        }
      } catch (error) {
        console.error('Could not load map', error)
      }
    })
  }, [])

  return (
    <div className={styles.body}>
      <div ref={mapContainer} className={styles.container}>
        {selectedDeclikers && <Popup declikers={selectedDeclikers} onClose={() => setSelectedDeclikers(null)} />}
      </div>
      <Select
        placeholder='Filtrer par metier...'
        isMulti
        options={professions}
        className={styles.select}
        onChange={(values) => {
          if (map.current) {
            ;(map.current.getSource('declikers') as GeoJSONSource).setData({
              type: 'FeatureCollection',
              features: declikers
                .filter((decliker) =>
                  values.length > 0 ? decliker.jobs && values.some(({ value }) => decliker.jobs.includes(value)) : true
                )
                .map((decliker) => ({
                  type: 'Feature',
                  properties: { name: decliker.name, id: decliker.id },
                  geometry: decliker.geometry,
                })),
            })
          }
        }}
        styles={selectStyles}
      />
    </div>
  )
}

export default Map
