// Signed-in map page (/map): full map, region table and PSI guide.
import { AirMap } from '../components/AirMap'
import { DataMeta } from '../components/DataMeta'
import { PageHeader } from '../components/PageHeader'
import { RegionList } from '../components/RegionList'
import { BandGuide } from '../components/BandGuide'
import { ErrorNotice, Skeleton } from '../components/States'
import { useLocation } from '../data/LocationContext'
import { useProfile } from '../data/ProfileContext'
import { useReadings } from '../data/ReadingsContext'

export default function MapPage() {
  const { data, error, refresh } = useReadings()
  const { places } = useProfile()
  const loc = useLocation()

  return (
    <div className="page">
      <PageHeader title="Map">
        <DataMeta />
      </PageHeader>
      {error && !data && <ErrorNotice onRetry={refresh} />}
      <div className="map-layout">
        <div className="card card-map map-main">
          {data ? <AirMap variant="inline" regions={data.regions} places={places} current={loc.coords} /> : <Skeleton height="100%" radius={12} />}
        </div>
        <aside className="map-side">
          <section className="card">
            <h2 className="card-title">Regions now</h2>
            {data ? <RegionList regions={data.regions} highlightId={loc.regionId} /> : <Skeleton height={180} />}
          </section>
          <BandGuide />
        </aside>
      </div>
    </div>
  )
}
