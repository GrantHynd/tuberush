import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import { Colors, Spacing, TFL, Typography } from '@/constants/theme';
import type { InlinePart, LegalDocument } from '@/lib/legal-copy';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function InlineContent({ content }: { content: InlinePart[] }) {
    const router = useRouter();

    return (
        <Text style={styles.paragraph}>
            {content.map((part, index) => {
                if (typeof part === 'string') {
                    return <Text key={index}>{part}</Text>;
                }
                if ('route' in part) {
                    return (
                        <Text
                            key={index}
                            style={styles.link}
                            onPress={() => router.push(part.route)}
                            accessibilityRole="link"
                        >
                            {part.text}
                        </Text>
                    );
                }
                return (
                    <Text
                        key={index}
                        style={styles.link}
                        onPress={() => Linking.openURL(`mailto:${part.email}`)}
                        accessibilityRole="link"
                    >
                        {part.text}
                    </Text>
                );
            })}
        </Text>
    );
}

export function LegalDocumentView({ document }: { document: LegalDocument }) {
    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <HeaderBackButton title={document.title} />
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.updated}>{document.updated}</Text>
                <InlineContent content={document.intro} />
                {document.blocks.map((block, index) => {
                    if (block.type === 'h2') {
                        return (
                            <Text key={index} style={styles.heading}>
                                {block.text}
                            </Text>
                        );
                    }
                    if (block.type === 'ul') {
                        return (
                            <View key={index} style={styles.list}>
                                {block.items.map((item) => (
                                    <Text key={item} style={styles.paragraph}>
                                        {'• '}
                                        {item}
                                    </Text>
                                ))}
                            </View>
                        );
                    }
                    return <InlineContent key={index} content={block.content} />;
                })}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    content: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.xxl,
    },
    updated: {
        ...Typography.caption,
        marginBottom: Spacing.md,
    },
    heading: {
        ...Typography.h3,
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    paragraph: {
        ...Typography.body,
        marginBottom: Spacing.sm,
    },
    list: {
        gap: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    link: {
        color: TFL.blue,
        fontWeight: '600',
    },
});
