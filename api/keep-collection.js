export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const origin = process.env.SITE_URL || 'https://j00ba.xyz';
  response.setHeader('Cache-Control', 'public, s-maxage=300');
  return response.status(200).json({
    name: 'Lost Keeps',
    description:
      '4444 procedurally generated dungeons found through IMPLINGz adventures. Each keep has a Biome, Dungeon Type, and Mini Boss. Minting is free on j00ba.xyz. Trade on OpenSea in ETH.',
    image: `${origin.replace(/\/$/, '')}/roadmap/roadmap-dungeon.png`,
    external_link: `${origin.replace(/\/$/, '')}/the-dungeon`,
    seller_fee_basis_points: 800,
    fee_recipient: '0x53391bf6931E3a8d829029b2a7640f3213cF6C94',
  });
}
