import { LegalDocumentView } from '@/components/LegalDocumentView';
import { privacyPolicy } from '@/lib/legal-copy';
import React from 'react';

export default function PrivacyScreen() {
    return <LegalDocumentView document={privacyPolicy} />;
}
