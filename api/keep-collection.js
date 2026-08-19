export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const origin = process.env.SITE_URL || 'https://j00ba.xyz';
  response.setHeader('Cache-Control', 'public, s-maxage=300');
  return response.status(200).json({
    name: 'Imp Keeps',
    description:
      '2222 procedurally generated Imp Keeps found through IMPLINGz adventures on Robinhood Chain. Each keep has Environment, Type, and Mini Boss. Minting is free aside from ETH gas. Trade on OpenSea in ETH.',
    image: `${origin.replace(/\/$/, '')}/roadmap/roadmap-dungeon.png`,
    external_link: `${origin.replace(/\/$/, '')}/the-dungeon`,
    seller_fee_basis_points: 800,
    fee_recipient: '0x53391bf6931E3a8d829029b2a7640f3213cF6C94',
  });
}
