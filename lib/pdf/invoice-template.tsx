'use client'

import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
} from '@react-pdf/renderer'

// Register fonts for better typography
Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf', fontWeight: 400 },
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf', fontWeight: 700 },
    ],
})

// Sage-style document matching the provided image
const styles = StyleSheet.create({
    page: {
        fontFamily: 'Roboto',
        fontSize: 9,
        padding: 30,
        backgroundColor: '#FFFFFF',
        position: 'relative',
    },
    // Watermark
    watermark: {
        position: 'absolute',
        top: '40%',
        left: '15%',
        transform: 'rotate(-45deg)',
        fontSize: 60,
        color: 'rgba(200, 200, 200, 0.3)',
        fontWeight: 700,
        letterSpacing: 8,
    },
    // Header section
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    logoSection: {
        width: '35%',
    },
    logoText: {
        fontSize: 24,
        fontWeight: 700,
        color: '#1e40af', // Blue
    },
    logoSubtext: {
        fontSize: 8,
        color: '#dc2626', // Red
        marginTop: 2,
    },
    // Document info (left side)
    docInfoSection: {
        marginBottom: 15,
    },
    docInfoRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    docInfoLabel: {
        fontSize: 11,
        fontWeight: 700,
        width: 130,
        color: '#1f2937',
    },
    docInfoValue: {
        fontSize: 11,
        color: '#1f2937',
    },
    // Client box (right side - blue border)
    clientSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    leftColumn: {
        width: '45%',
    },
    clientBox: {
        width: '50%',
        borderWidth: 2,
        borderColor: '#1e40af',
        padding: 10,
        marginLeft: 'auto',
    },
    clientName: {
        fontSize: 12,
        fontWeight: 700,
        color: '#1f2937',
        marginBottom: 4,
    },
    clientAddress: {
        fontSize: 9,
        color: '#4b5563',
        marginBottom: 8,
    },
    clientInfoRow: {
        flexDirection: 'row',
        marginBottom: 2,
    },
    clientInfoLabel: {
        fontSize: 8,
        fontWeight: 700,
        width: 40,
        color: '#1e40af',
    },
    clientInfoValue: {
        fontSize: 8,
        color: '#4b5563',
    },
    // Contact line
    contactLine: {
        textAlign: 'right',
        marginBottom: 15,
        fontSize: 9,
    },
    contactName: {
        fontWeight: 700,
    },
    contactRole: {
        color: '#4b5563',
    },
    // Table
    table: {
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderBottomWidth: 2,
        borderBottomColor: '#1e40af',
        paddingVertical: 6,
        paddingHorizontal: 4,
    },
    tableHeaderCell: {
        fontSize: 8,
        fontWeight: 700,
        color: '#1f2937',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#e5e7eb',
        paddingVertical: 5,
        paddingHorizontal: 4,
    },
    tableCell: {
        fontSize: 8,
        color: '#374151',
    },
    // Column widths matching Sage style
    colRef: { width: '12%' },
    colDesign: { width: '38%' },
    colQty: { width: '10%', textAlign: 'right' },
    colPU: { width: '12%', textAlign: 'right' },
    colRemise: { width: '10%', textAlign: 'right' },
    colTotal: { width: '13%', textAlign: 'right' },
    colTax: { width: '5%', textAlign: 'center' },
    // Footer totals section
    footerSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    remarqueSection: {
        width: '45%',
    },
    remarqueLabel: {
        fontSize: 9,
        fontWeight: 700,
        textDecoration: 'underline',
        marginBottom: 5,
        color: '#1f2937',
    },
    remarqueText: {
        fontSize: 8,
        color: '#6b7280',
    },
    totalsSection: {
        width: '45%',
    },
    currencyNote: {
        fontSize: 8,
        color: '#1e40af',
        textAlign: 'right',
        marginBottom: 8,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 4,
    },
    totalLabel: {
        fontSize: 10,
        fontWeight: 700,
        width: 100,
        color: '#1f2937',
    },
    totalValue: {
        fontSize: 10,
        width: 80,
        textAlign: 'right',
        color: '#1f2937',
    },
    totalRowGrand: {
        borderTopWidth: 1,
        borderTopColor: '#1f2937',
        paddingTop: 4,
        marginTop: 4,
    },
    totalValueGrand: {
        fontSize: 11,
        fontWeight: 700,
    },
    // Company footer
    companyFooter: {
        position: 'absolute',
        bottom: 20,
        left: 30,
        right: 30,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 10,
    },
    footerText: {
        fontSize: 7,
        color: '#9ca3af',
        textAlign: 'center',
        marginBottom: 2,
    },
    footerBold: {
        fontWeight: 700,
        color: '#1e40af',
    },
})

// Types
export interface InvoiceLineItem {
    reference: string
    designation: string
    quantity: number
    unitPrice: number
    discount: number
    total: number
    taxCode?: string
}

export interface InvoiceCompany {
    name: string
    tagline?: string
    address: string
    city: string
    postalCode: string
    country: string
    phone?: string
    fax?: string
    email?: string
    ice?: string
    rc?: string
}

export interface InvoiceData {
    // Document info
    documentNumber: string
    documentType: string
    date: string
    devisNumber?: string
    // Parties
    company: InvoiceCompany
    client: {
        name: string
        address?: string
        city?: string
        postalCode?: string
        country?: string
        ice?: string
        phone?: string
        fax?: string
        email?: string
    }
    contactName?: string
    contactRole?: string
    // Lines
    lines: InvoiceLineItem[]
    // Totals
    subtotal: number
    discount: number
    taxAmount: number
    total: number
    amountPaid?: number
    // Payment
    paymentStatus: 'paid' | 'partial' | 'pending'
    paymentTerms?: string
    remarque?: string
    // Watermark
    showWatermark?: boolean
    watermarkText?: string
}

// Format currency French style - replace special spaces with regular space for PDF compatibility
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount).replace(/\s/g, ' ') // Replace narrow no-break space with regular space
}

// Format quantity
const formatQty = (qty: number) => {
    return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(qty).replace(/\s/g, ' ') // Replace narrow no-break space with regular space
}

// Invoice Document Component - Sage Style
export function InvoiceDocument({ data }: { data: InvoiceData }) {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Watermark */}
                {data.showWatermark && (
                    <Text style={styles.watermark}>
                        {data.watermarkText || 'DUPLICATA'}
                    </Text>
                )}

                {/* Header with Logo */}
                <View style={styles.header}>
                    <View style={styles.logoSection}>
                        <Text style={styles.logoText}>HAY</Text>
                        <Text style={[styles.logoText, { marginTop: -8 }]}>2010<Text style={{ fontSize: 10 }}>.Sarl</Text></Text>
                        <Text style={styles.logoSubtext}>Travaux d'électrification</Text>
                        <Text style={styles.logoSubtext}>& Eclairage public</Text>
                    </View>
                </View>

                {/* Document Info + Client Box */}
                <View style={styles.clientSection}>
                    {/* Left: Document Info */}
                    <View style={styles.leftColumn}>
                        <View style={styles.docInfoRow}>
                            <Text style={styles.docInfoLabel}>{data.documentType} N° :</Text>
                            <Text style={styles.docInfoValue}>{data.documentNumber}</Text>
                        </View>
                        <View style={styles.docInfoRow}>
                            <Text style={styles.docInfoLabel}>Date {data.documentType.split(' ')[0]} :</Text>
                            <Text style={styles.docInfoValue}>{data.date}</Text>
                        </View>
                        {data.devisNumber && (
                            <View style={styles.docInfoRow}>
                                <Text style={styles.docInfoLabel}>DEVIS N° :</Text>
                                <Text style={styles.docInfoValue}>{data.devisNumber}</Text>
                            </View>
                        )}
                    </View>

                    {/* Right: Client Box */}
                    <View style={styles.clientBox}>
                        <Text style={styles.clientName}>{data.client.name}</Text>
                        <Text style={styles.clientAddress}>
                            {data.client.city}
                            {data.client.address && `\n${data.client.address}`}
                        </Text>
                        {data.client.ice && (
                            <View style={styles.clientInfoRow}>
                                <Text style={styles.clientInfoLabel}>ICE :</Text>
                                <Text style={styles.clientInfoValue}>{data.client.ice}</Text>
                            </View>
                        )}
                        {data.client.phone && (
                            <View style={styles.clientInfoRow}>
                                <Text style={styles.clientInfoLabel}>Tél :</Text>
                                <Text style={styles.clientInfoValue}>{data.client.phone}</Text>
                                {data.client.fax && (
                                    <>
                                        <Text style={[styles.clientInfoLabel, { marginLeft: 10 }]}>Fax :</Text>
                                        <Text style={styles.clientInfoValue}>{data.client.fax}</Text>
                                    </>
                                )}
                            </View>
                        )}
                        {data.client.email && (
                            <View style={styles.clientInfoRow}>
                                <Text style={styles.clientInfoLabel}>Email :</Text>
                                <Text style={styles.clientInfoValue}>{data.client.email}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Contact Line */}
                {data.contactName && (
                    <View style={styles.contactLine}>
                        <Text>
                            <Text style={styles.contactName}>{data.contactName}</Text>
                            {data.contactRole && (
                                <Text style={styles.contactRole}> : {data.contactRole}</Text>
                            )}
                        </Text>
                    </View>
                )}

                {/* Table */}
                <View style={styles.table}>
                    {/* Header */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, styles.colRef]}>Référence</Text>
                        <Text style={[styles.tableHeaderCell, styles.colDesign]}>Désignation</Text>
                        <Text style={[styles.tableHeaderCell, styles.colQty]}>Qté</Text>
                        <Text style={[styles.tableHeaderCell, styles.colPU]}>Px unitaire</Text>
                        <Text style={[styles.tableHeaderCell, styles.colRemise]}>Remise</Text>
                        <Text style={[styles.tableHeaderCell, styles.colTotal]}>Montant HT</Text>
                        <Text style={[styles.tableHeaderCell, styles.colTax]}>*</Text>
                    </View>
                    {/* Rows */}
                    {data.lines.map((line, index) => (
                        <View key={index} style={styles.tableRow}>
                            <Text style={[styles.tableCell, styles.colRef]}>{line.reference}</Text>
                            <Text style={[styles.tableCell, styles.colDesign]}>{line.designation}</Text>
                            <Text style={[styles.tableCell, styles.colQty]}>{formatQty(line.quantity)}</Text>
                            <Text style={[styles.tableCell, styles.colPU]}>{formatCurrency(line.unitPrice)}</Text>
                            <Text style={[styles.tableCell, styles.colRemise]}>
                                {line.discount > 0 ? formatCurrency(line.discount) : ''}
                            </Text>
                            <Text style={[styles.tableCell, styles.colTotal]}>{formatCurrency(line.total)}</Text>
                            <Text style={[styles.tableCell, styles.colTax]}>{line.taxCode || 'D20'}</Text>
                        </View>
                    ))}
                </View>

                {/* Footer: Remarque + Totals */}
                <View style={styles.footerSection}>
                    {/* Remarque */}
                    <View style={styles.remarqueSection}>
                        <Text style={styles.remarqueLabel}>Remarque :</Text>
                        <Text style={styles.remarqueText}>{data.remarque || ''}</Text>
                    </View>

                    {/* Totals */}
                    <View style={styles.totalsSection}>
                        <Text style={styles.currencyNote}>Montants exprimés en Dirhams</Text>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>TOTAL HT</Text>
                            <Text style={styles.totalValue}>{formatCurrency(data.subtotal)}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>TOTAL TVA</Text>
                            <Text style={styles.totalValue}>{formatCurrency(data.taxAmount)}</Text>
                        </View>
                        <View style={[styles.totalRow, styles.totalRowGrand]}>
                            <Text style={styles.totalLabel}>TOTAL T.T.C</Text>
                            <Text style={[styles.totalValue, styles.totalValueGrand]}>{formatCurrency(data.total)}</Text>
                        </View>
                    </View>
                </View>

                {/* Company Footer */}
                <View style={styles.companyFooter}>
                    <Text style={styles.footerText}>
                        <Text style={styles.footerBold}>{data.company.name}</Text> - {data.company.address}, {data.company.city}
                    </Text>
                    <Text style={styles.footerText}>
                        {data.company.phone && `Tél: ${data.company.phone}`}
                        {data.company.email && ` | Email: ${data.company.email}`}
                        {data.company.ice && ` | ICE: ${data.company.ice}`}
                        {data.company.rc && ` | RC: ${data.company.rc}`}
                    </Text>
                </View>
            </Page>
        </Document>
    )
}
