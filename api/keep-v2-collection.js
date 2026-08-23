export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const origin = process.env.SITE_URL || 'https://j00ba.xyz';
  response.setHeader('Cache-Control', 'public, s-maxage=300');
  return response.status(200).json({
    name: 'IMPLINGz Keeps',
    description:
      'IMPLINGz Keeps can be migrated onto the new contract, those evil exploiters have been voided and cannot migrate over! Each keep has Environment, Type, and Mini Boss.',
    image: `${origin.replace(/\/$/, '')}/roadmap/roadmap-dungeon.png`,
    external_link: `${origin.replace(/\/$/, '')}/the-dungeon`,
    seller_fee_basis_points: 800,
    fee_recipient: '0x53391bf6931E3a8d829029b2a7640f3213cF6C94',
  });
}
