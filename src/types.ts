export type Labourer = {
  id: string;
  name: string;
  trade: string;
  hourlyRate: number;
  suburb: string;
  availableText: string; // simple for now
  rating: number; // 0-5
};