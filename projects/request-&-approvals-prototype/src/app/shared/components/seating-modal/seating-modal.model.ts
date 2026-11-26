export interface SeatingInformation {
  units: number;
  sessionName: string;
  seats?: Array<string>;
}

export interface SeatingMapConfig {
  eventKey: string;
  secretKey: string;
}
