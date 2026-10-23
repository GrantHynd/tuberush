import { LegalDocumentView } from '@/components/LegalDocumentView';
import { termsOfUse } from '@/lib/legal-copy';
import React from 'react';

export default function TermsScreen() {
    return <LegalDocumentView document={termsOfUse} />;
}
