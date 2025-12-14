import { Provider, Professional } from './types';

export const PROFESSIONALS: Professional[] = [
  { id: 'p1', name: 'Iwlys', avatarUrl: 'https://storagesalon.s3.sa-east-1.amazonaws.com/237813239886b2ebf01c5447ad5c3ec17419d9cf22fcpp.jpg', role: 'Barbeiro' },
  { id: 'p2', name: 'Rodrigo', avatarUrl: 'https://storagesalon.s3.sa-east-1.amazonaws.com/237813237813635684a28748d8a7e25eb63ed34590e3pp.jpg', role: 'Barbeiro' },
  { id: 'p3', name: 'Jefter', avatarUrl: 'https://storagesalon.s3.sa-east-1.amazonaws.com/237813277566dda64785067db96fb7bf3ade0dfaf6c4pp.jpg', role: 'Barbeiro' },
];

export const MOCK_PROVIDER: Provider = {
  id: 'provider-1',
  name: 'Zero Um Barber Shop',
  handle: 'zeroum.jequie',
  avatarUrl: 'https://storagesalon.s3.sa-east-1.amazonaws.com/237813logomarca3cc485ee218540c2e908f319ee0b53b1pc.jpg',
  rating: 4.9,
  reviewCount: 342,
  location: 'Centro, Jequié - BA',
  professionals: PROFESSIONALS,
  services: [
    // Beard
    { 
      id: '1', 
      name: 'Barba', 
      description: 'Modelagem e hidratação.', 
      duration: 30, 
      price: 25, 
      category: 'Barba',
      imageUrl: 'https://images.unsplash.com/photo-1503951914875-befea74701c5?w=800&auto=format&fit=crop&q=60'
    },
    { 
      id: '2', 
      name: 'Barboterapia', 
      description: 'Barba com toalha quente e massagem.', 
      duration: 30, 
      price: 30, 
      category: 'Barba',
      imageUrl: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&auto=format&fit=crop&q=60'
    },
    
    // Hair
    { 
      id: '3', 
      name: 'Corte', 
      description: 'Corte social ou moderno.', 
      duration: 30, 
      price: 35, 
      category: 'Cabelo',
      imageUrl: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&auto=format&fit=crop&q=60'
    },
    { 
      id: '11', 
      name: 'Freestyle', 
      description: 'Desenhos e arte no cabelo.', 
      duration: 20, 
      price: 25, 
      category: 'Cabelo',
      imageUrl: 'https://images.unsplash.com/photo-1593702288056-40e697e62754?w=800&auto=format&fit=crop&q=60'
    },
    { 
      id: '15', 
      name: 'Platinado', 
      description: 'Descoloração global.', 
      duration: 60, 
      price: 180, 
      category: 'Química',
      imageUrl: 'https://images.unsplash.com/photo-1616952936720-3b4787a71676?w=800&auto=format&fit=crop&q=60'
    },
    
    // Combos
    { 
      id: '4', 
      name: 'Corte + Barba', 
      description: 'Combo clássico.', 
      duration: 60, 
      price: 55, 
      category: 'Combos',
      imageUrl: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&auto=format&fit=crop&q=60'
    },
    { 
      id: '5', 
      name: 'Corte + Barba + Sobrancelhas', 
      description: 'Serviço completo.', 
      duration: 60, 
      price: 60, 
      category: 'Combos',
      imageUrl: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&auto=format&fit=crop&q=60'
    },
    { 
      id: '6', 
      name: 'Corte + Barboterapia', 
      description: 'Corte e relaxamento facial.', 
      duration: 60, 
      price: 60, 
      category: 'Combos',
      imageUrl: 'https://images.unsplash.com/photo-1503951914875-befea74701c5?w=800&auto=format&fit=crop&q=60'
    },
    { 
      id: '7', 
      name: 'Corte + Barboterapia + Sobrancelhas', 
      description: 'A experiência completa.', 
      duration: 60, 
      price: 65, 
      category: 'Combos',
      imageUrl: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800&auto=format&fit=crop&q=60'
    },
    { 
      id: '8', 
      name: 'Corte + Freestyle', 
      description: 'Corte com arte.', 
      duration: 30, 
      price: 40, 
      category: 'Combos',
      imageUrl: 'https://images.unsplash.com/photo-1593702288056-40e697e62754?w=800&auto=format&fit=crop&q=60'
    },
    { 
      id: '9', 
      name: 'Corte + Sobrancelhas', 
      description: 'Alinhamento do visual.', 
      duration: 30, 
      price: 40, 
      category: 'Combos',
      imageUrl: 'https://images.unsplash.com/photo-1504812888631-4a41f6e2e505?w=800&auto=format&fit=crop&q=60'
    },
    { 
      id: '10', 
      name: 'Corte + Penteado', 
      description: 'Corte com finalização especial.', 
      duration: 30, 
      price: 45, 
      category: 'Combos',
      imageUrl: 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?w=800&auto=format&fit=crop&q=60'
    },
    { 
      id: '16', 
      name: 'Platinado + Corte', 
      description: 'Visual totalmente novo.', 
      duration: 60, 
      price: 200, 
      category: 'Combos',
      imageUrl: 'https://images.unsplash.com/photo-1616952936720-3b4787a71676?w=800&auto=format&fit=crop&q=60'
    },
    { 
      id: '17', 
      name: 'Platinado + Corte + Barba', 
      description: 'Transformação total.', 
      duration: 120, 
      price: 220, 
      category: 'Combos',
      imageUrl: 'https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b2?w=800&auto=format&fit=crop&q=60'
    },
    { 
      id: '18', 
      name: 'Platinado + Corte + Barboterapia', 
      description: 'Transformação com relaxamento.', 
      duration: 120, 
      price: 225, 
      category: 'Combos',
      imageUrl: 'https://images.unsplash.com/photo-1534349762913-57a46984e77d?w=800&auto=format&fit=crop&q=60'
    },

    // Others
    { 
      id: '12', 
      name: 'Hidratação', 
      description: 'Tratamento capilar profundo.', 
      duration: 30, 
      price: 25, 
      category: 'Tratamento',
      imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=60'
    },
    { 
      id: '13', 
      name: 'Penteado', 
      description: 'Modelagem para eventos.', 
      duration: 15, 
      price: 25, 
      category: 'Acabamento',
      imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=60'
    },
    { 
      id: '14', 
      name: 'Pezinho', 
      description: 'Acabamento do corte.', 
      duration: 15, 
      price: 15, 
      category: 'Acabamento',
      imageUrl: 'https://images.unsplash.com/photo-1503951914875-befea74701c5?w=800&auto=format&fit=crop&q=60'
    },
    { 
      id: '19', 
      name: 'Sobrancelhas', 
      description: 'Design na navalha.', 
      duration: 15, 
      price: 15, 
      category: 'Acabamento',
      imageUrl: 'https://images.unsplash.com/photo-1596704017254-9b1b1c9c9c1c?w=800&auto=format&fit=crop&q=60'
    },
  ],
  loyaltyProgram: {
    enabled: true,
    threshold: 10,
    rewardDescription: "Corte Grátis"
  },
  policies: [
    "Cancelamento com 24h de antecedência.",
    "Tolerância de atraso de 10 minutos.",
    "No-show sujeito a taxa de 50% no próximo agendamento."
  ]
};

export const TIME_SLOTS = [
  { id: 't1', time: '09:00', available: true },
  { id: 't2', time: '10:00', available: true },
  { id: 't3', time: '11:00', available: false },
  { id: 't4', time: '13:00', available: true },
  { id: 't5', time: '14:00', available: true },
  { id: 't6', time: '15:00', available: true },
  { id: 't7', time: '16:00', available: true },
  { id: 't8', time: '17:00', available: false },
  { id: 't9', time: '18:00', available: true },
  { id: 't10', time: '19:00', available: true },
];
