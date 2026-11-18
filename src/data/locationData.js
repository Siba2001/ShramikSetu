// Odisha Districts & Blocks Registry for ShramikSetu
export const INITIAL_DISTRICTS = [
  {
    id: 'dist-ganjam',
    name: 'Ganjam',
    code: 'OD-GM',
    headquarter: 'Chhatrapur',
    blocks: [
      'Digapahandi',
      'Sanakhemundi',
      'Patrapur',
      'Kukudakhandi',
      'Sheragada',
      'Surada',
      'Chikiti',
      'Hinjilikatu',
      'Kabisuryanagar',
      'Polasara',
      'Pursottampur',
      'Buguda',
      'Dharakote',
      'Rangeilunda',
      'Berhampur',
      'Chhatrapur',
      'Aska',
      'Belleda',
      'Ganjam',
      'Khallikote',
      'Kodala',
      'Purushottampur'
    ]
  },
  {
    id: 'dist-gajapati',
    name: 'Gajapati',
    code: 'OD-GP',
    headquarter: 'Paralakhemundi',
    blocks: [
      'Mohana',
      'R. Udayagiri',
      'Kashinagar',
      'Gumma',
      'Nuagada',
      'Rayagada',
      'Gosani'
    ]
  }
];

export const ALL_BLOCKS = [
  'Digapahandi',
  'Sanakhemundi',
  'Patrapur',
  'Kukudakhandi',
  'Sheragada',
  'Surada',
  'Chikiti',
  'Hinjilikatu',
  'Kabisuryanagar',
  'Polasara',
  'Pursottampur',
  'Buguda',
  'Dharakote',
  'Rangeilunda',
  'Berhampur',
  'Chhatrapur',
  'Aska',
  'Mohana',
  'R. Udayagiri'
];

export const SERVICE_MODULES = [
  {
    id: 'new-card',
    name: 'New Shramik Card',
    serviceKey: 'New Card',
    path: '/applications/new-card',
    description: 'Registration of new construction workers and Aadhaar/E-Sign verification'
  },
  {
    id: 'card-renewal',
    name: 'Card Renewal / Annual Contribution',
    serviceKey: 'Card Renewal',
    path: '/applications/card-renewal',
    description: 'Annual contribution payment, card renewal, and resumption of registration'
  },
  {
    id: 'marriage-benefit',
    name: 'Marriage Benefit',
    serviceKey: 'Marriage Benefit Apply',
    path: '/applications/marriage-benefit',
    description: 'Financial assistance claims for worker or daughter marriage'
  },
  {
    id: 'maternity-benefit',
    name: 'Maternity Benefit',
    serviceKey: 'Maternity Benefit Apply',
    path: '/applications/maternity-benefit',
    description: 'Maternity assistance for registered female construction workers'
  },
  {
    id: 'death-benefit',
    name: 'Death Benefit',
    serviceKey: 'Death Benefit Apply',
    path: '/applications/death-benefit',
    description: 'Fatal and non-fatal accident and natural death compensation claims'
  },
  {
    id: 'education-assistance',
    name: 'Education Assistance',
    serviceKey: 'Education Assistance Apply',
    path: '/applications/education-assistance',
    description: 'Educational scholarship and grant applications for workers children'
  }
];
