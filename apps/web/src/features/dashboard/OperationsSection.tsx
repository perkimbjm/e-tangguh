import {
  AFFECTED_LABEL,
  AFFECTED_STATUSES,
  type DashboardDto,
  EMPLOYMENT_LABEL,
  EMPLOYMENT_STATUSES,
} from '@etangguh/shared';
import { BarList } from '../../components/charts/BarList';
import { ChartCard } from '../../components/charts/ChartCard';
import { ColumnChart } from '../../components/charts/ColumnChart';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Bagian khusus peran BPBD: kejadian dan kesiapan petugas. */
export function OperationsSection({
  officers,
  events,
}: {
  officers: NonNullable<DashboardDto['officers']>;
  events: NonNullable<DashboardDto['events']>;
}) {
  const duties = [
    { label: 'TRC Penanganan Darurat (PDB)', value: officers.duties.trcPdb },
    { label: 'TRC Kejadian Luar Biasa (KLB)', value: officers.duties.trcKlb },
    { label: 'Pencarian, Penyelamatan, Evakuasi', value: officers.duties.ppe },
    { label: 'Petugas operasi', value: officers.duties.ops },
  ];
  const status = EMPLOYMENT_STATUSES.map((s) => ({
    label: EMPLOYMENT_LABEL[s],
    value: officers.byStatus[s],
  }));
  const affected = AFFECTED_STATUSES.map((s) => ({
    label: AFFECTED_LABEL[s],
    value: events.affected[s],
  }));
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <ChartCard
        className="lg:col-span-2"
        title="Kejadian bencana per bulan"
        subtitle={`${events.total.toLocaleString('id-ID')} kejadian tercatat · waktu WITA`}
        table={{
          headers: ['Bulan', 'Kejadian'],
          rows: MONTHS.map((m, i) => [m, events.byMonth[i] ?? 0]),
        }}
      >
        <ColumnChart labels={MONTHS} values={events.byMonth} unit=" kejadian" />
      </ChartCard>
      <ChartCard
        title="Status warga terdampak"
        subtitle="Seluruh kejadian tahun ini"
        table={{ headers: ['Status', 'Orang'], rows: affected.map((a) => [a.label, a.value]) }}
      >
        <BarList items={affected} sorted={false} />
      </ChartCard>
      <ChartCard
        title="Kesiapan penugasan petugas"
        subtitle={`${officers.total.toLocaleString('id-ID')} petugas tercatat`}
        table={{ headers: ['Penugasan', 'Petugas'], rows: duties.map((d) => [d.label, d.value]) }}
      >
        <BarList items={duties} sorted={false} max={Math.max(1, officers.total)} />
      </ChartCard>
      <ChartCard
        className="lg:col-span-2"
        title="Aparatur menurut status kepegawaian"
        subtitle="Dasar kolom 4-8 Form 5.A.4"
        table={{ headers: ['Status', 'Petugas'], rows: status.map((s) => [s.label, s.value]) }}
      >
        <BarList items={status} />
      </ChartCard>
    </div>
  );
}
