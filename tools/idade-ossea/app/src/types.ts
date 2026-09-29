import type { ProfessionalAssessment } from "./professional";

export interface GrayImage {
  pixels: Uint8Array;
  width: number;
  height: number;
  format: string;
  sex?: "male" | "female";
  dob?: string;
  examDate?: string;
}
export interface Crop {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
export interface ModelFile {
  file: string;
  bytes: number;
  sha256: string;
}
export interface Manifest {
  id: string;
  revision: string;
  format: string;
  totalBytes: number;
  models: ModelFile[];
  reference: string;
}
export interface Result {
  months: number;
  folds: number[];
  seconds: number;
  revision: string;
  model: string;
  crop: Crop;
  sex: "male" | "female";
  dob: string;
  examDate: string;
  professional?: ProfessionalAssessment;
}
