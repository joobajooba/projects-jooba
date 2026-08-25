import { lazy, Suspense } from 'react';

const StakingPage = lazy(() => import('./StakingPage'));

export default function StakingGatePage() {
  return (
    <Suspense fallback={<p className="adventures-page__intro">Opening Staking…</p>}>
      <StakingPage />
    </Suspense>
  );
}
