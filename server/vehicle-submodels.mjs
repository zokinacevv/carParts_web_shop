import mobileVehicles from './data/mobile-vehicles.json' with { type: 'json' }
// Verified starter selections. Entries are not cross-multiplied across generations or engines.
// Sources and coverage limits: docs/quote-catalog.md.
const starterSubmodels = {
 BMW: {
  '3 Series': ['3 Series 318i','3 Series 320i','3 Series 330i','3 Series 340i','3 Series 318d','3 Series 320d','3 Series 320d ED','3 Series 330d','3 Series 335d','3 Series Saloon','3 Series Touring'],
 },
 'Mercedes-Benz': {
  'C-Class': ['C-Class W202','C-Class W203','C-Class S203 T-Modell','C-Class CL203 Sportcoupé','C-Class W204','C-Class W205','C-Class W206','C-Class C 200'],
 },
 Audi: {
  A4: ['A4 Sedan','A4 Avant','A4 allroad quattro','A4 30 TDI','A4 35 TDI','A4 35 TFSI','A4 40 TFSI','A4 45 TFSI'],
 },
 Volkswagen: {
  Golf: ['Golf I','Golf II','Golf III','Golf IV','Golf V','Golf VI','Golf VII','Golf VIII','Golf GTI','Golf R'],
 },
 SEAT: {
  Leon: ['Leon I (1999)','Leon II (2005)','Leon III (2012)','Leon IV (2020)'],
 },
 Porsche: {
  '911': ['911 Original','911 G Model','911 964','911 993','911 996','911 997','911 991','911 992','911 Carrera','911 Carrera S','911 Carrera 4','911 Carrera 4S','911 Targa','911 Cabriolet','911 GTS','911 GT2','911 GT2 RS','911 GT3','911 GT3 RS'],
 },
}

export const vehicleSubmodels = Object.fromEntries(
 ['BMW','Mercedes-Benz','Audi','Volkswagen','SEAT','Porsche'].map(make => {
  const families = {...starterSubmodels[make]}
  for (const series of mobileVehicles.series.filter(series => series.make === make)) {
   families[series.model] = [...new Set([...(families[series.model] || []), ...series.submodels])]
  }
  return [make, families]
 })
)
