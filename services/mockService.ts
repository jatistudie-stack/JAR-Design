import { DesignRequest } from '../types';

export const INITIAL_REQUESTS: DesignRequest[] = [
  {
    id: 'req_001',
    outletName: 'Kopi Kenangan - Grand Indo',
    designType: 'Social Media',
    dimensions: '1080x1080px',
    elements: 'Logo needs to be top right. Feature the new Latte.',
    referenceUrl: 'https://instagram.com/example',
    status: 'Done',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    resultFileName: 'feed-design-v1.png',
    resultFileUrl: '#'
  },
  {
    id: 'req_002',
    outletName: 'Janji Jiwa - Tebet',
    designType: 'Banner',
    dimensions: '200x80cm',
    elements: 'Promo "Buy 1 Get 1" bold text. Red background.',
    referenceUrl: '',
    status: 'In Progress',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  },
  {
    id: 'req_003',
    outletName: 'Fore Coffee - Senopati',
    designType: 'Menu',
    dimensions: 'A4',
    elements: 'Update prices for seasonal items.',
    referenceUrl: '',
    status: 'Pending',
    createdAt: new Date().toISOString(),
  },
];

export const MOCK_OTP = '1234';