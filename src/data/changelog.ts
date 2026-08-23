export interface BuildChangelog {
    version: string;
    description: string;
    changes: string[];
  }
  
  export const CHANGELOG: BuildChangelog[] = [
    {
      version: '2.4.2',
      description: 'Backup, recovery and device-lock improvements.',
      changes: [
        'Improved Face ID / passkey handling.',
        'Added safer device-lock recovery.',
        'Improved encrypted backup and restore.',
        'Improved partition switching and restore handling.',
      ],
    },
    {
      version: '2.4.1',
      description: 'UI and recurring transaction improvements.',
      changes: [
        'Improved application UI.',
        'Improved recurring transaction handling.',
      ],
    },
    {
      version: '2.4.0',
      description: 'Major application improvements.',
      changes: [
        'Added recurring transaction improvements.',
        'Added reporting improvements.',
      ],
    },
  ];