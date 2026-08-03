import { useRoute } from 'wouter';

export function PrintTransactionPage() {
  const [, params] = useRoute('/print/:id');
  return <div className="p-8">سند إخراج رقم {params?.id}</div>;
}