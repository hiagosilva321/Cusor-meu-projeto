import { Outlet, useMatch } from 'react-router-dom';
import { CeoLayout } from '@/components/ceo/CeoLayout';

export default function CeoArea() {
  const accessMatch = useMatch('/hashadmin1/acesso');
  const title = accessMatch ? 'Acesso ao painel CEO' : 'Área CEO — visão estratégica';

  return (
    <CeoLayout title={title}>
      <Outlet />
    </CeoLayout>
  );
}
