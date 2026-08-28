/** e-KRÉTA API típusok */

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  id_token?: string;
  scope?: string;
}

export interface StudentInfo {
  Nev: string;
  Uid: string;
  IntezmenyAzonosito?: string;
  IntezmenyNev?: string;
  TanevUid?: string;
  Intezmeny?: {
    Uid: string;
    RovidNev: string;
  };
}

export interface Lesson {
  Uid: string;
  Datum: string;
  KezdetIdopont: string;
  VegIdopont: string;
  Oraszam: number;
  Nev?: string;
  TanarNeve?: string | null;
  HelyettesTanarNeve?: string | null;
  TeremNeve?: string | null;
  Tema?: string | null;
  Tantargy?: {
    Uid: string;
    Nev: string;
    Kategoria?: {
      Uid: string;
      Nev: string;
      Leiras?: string;
    };
  };
  OsztalyCsoport?: {
    Uid: string;
    Nev: string;
  };
  Tipus?: {
    Uid: string;
    Nev: string;
    Leiras?: string;
  };
  Allapot?: {
    Uid: string;
    Nev: string;
    Leiras?: string;
  };
  HaziFeladatUid?: string | null;
  BejelentettSzamonkeresUids?: string[];
  IsHaziFeladatMegoldva?: boolean;
}

export interface SchoolYearEvent {
  Uid?: string;
  Nev?: string;
  Leiras?: string;
  KezdoDatum?: string;
  VegDatum?: string;
  Tipus?: {
    Uid?: string;
    Nev?: string;
    Leiras?: string;
  };
  // A pontos mezőnevek a KRÉTA válaszától függhetnek
  [key: string]: unknown;
}

export interface AuthCredentials {
  instituteCode: string;
  username: string;
  password: string;
}

export interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  instituteCode: string;
  expiresAt: number;
  studentName?: string;
}

export interface KretaGrade {
  Uid: string;
  KeszitesDatuma?: string;
  RogzitesDatuma?: string;
  SzamErtek?: number | null;
  SzovegesErtek?: string;
  SzovegesErtekelesRovidNev?: string;
  SulySzazalekErteke?: number;
  Tema?: string;
  ErtekeloTanarNeve?: string;
  Jelleg?: string;
  Tantargy?: { Uid?: string; Nev?: string };
  Tipus?: { Uid?: string; Nev?: string };
  Mod?: { Uid?: string; Nev?: string };
  ErtekFajta?: { Uid?: string; Nev?: string };
  OsztalyCsoport?: { Uid?: string; Nev?: string };
}

export interface SubjectAverage {
  Tantargy?: { Uid?: string; Nev?: string };
  Atlag?: number | null;
  [key: string]: unknown;
}
