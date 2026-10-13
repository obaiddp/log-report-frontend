import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type { AssetInspection } from "@/lib/api";
import {
  formatDateTime,
  formatInspectionStatus,
  orDash,
  preparedByName,
} from "@/lib/asset-inspections";

/**
 * Optional company logo.
 *
 * Drop a PNG/JPG into `src/assets/` and paste its data URI (or a reachable URL)
 * here. When null, a neutral ICT monogram is drawn instead so the form never
 * ships with a broken image.
 */
const LOGO_SRC: string | null = null;

const COLORS = {
  sectionBg: "#3f3f46",
  sectionText: "#ffffff",
  label: "#71717a",
  value: "#27272a",
  hairline: "#e4e4e7",
  hairlineSoft: "#f1f1f3",
  frame: "#d4d4d8",
} as const;

const styles = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingBottom: 22,
    paddingHorizontal: 26,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: COLORS.value,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  logoBox: {
    width: 46,
    height: 46,
    borderWidth: 1.2,
    borderColor: COLORS.sectionBg,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: { width: 42, height: 42 },
  logoText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    color: COLORS.sectionBg,
  },
  headerTitleBlock: { flex: 1, marginLeft: 12, paddingTop: 2 },
  headerTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
    letterSpacing: 1.1,
    color: "#18181b",
  },
  headerSubtitle: {
    marginTop: 3,
    fontSize: 8,
    letterSpacing: 1.5,
    color: "#52525b",
  },
  headerMeta: { textAlign: "right", fontSize: 7.5, color: "#52525b", lineHeight: 1.45 },

  sectionBar: {
    backgroundColor: COLORS.sectionBg,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  sectionBarSpaced: {
    marginTop: 13,
  },
  sectionBarText: {
    color: COLORS.sectionText,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textAlign: "center",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 0.5,
    borderColor: COLORS.frame,
  },
  cell: {
    width: "50%",
    minHeight: 27,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.hairline,
    borderRightWidth: 0.5,
    borderRightColor: COLORS.hairlineSoft,
    justifyContent: "center",
  },
  cellRight: {
    borderRightWidth: 0,
  },
  label: {
    fontSize: 6.5,
    letterSpacing: 0.5,
    color: COLORS.label,
    marginBottom: 1.5,
  },
  value: { fontSize: 9, color: COLORS.value },

  noteBlock: {
    borderWidth: 0.5,
    borderColor: COLORS.frame,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.hairline,
    paddingTop: 13,
    paddingBottom: 13,
    paddingHorizontal: 10,
    minHeight: 48,
  },
  noteRowLast: {
    borderBottomWidth: 0,
  },
  noteLabel: {
    width: "30%",
    paddingRight: 12,
    fontSize: 7,
    letterSpacing: 0.3,
    color: COLORS.label,
    lineHeight: 1.35,
  },
  noteValue: {
    width: "70%",
    fontSize: 9,
    lineHeight: 1.45,
    color: COLORS.value,
  },

  signatureBlock: {
    borderWidth: 0.5,
    borderColor: COLORS.frame,
  },
  signatureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.hairline,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 10,
    minHeight: 68,
  },
  signatureRowLast: {
    borderBottomWidth: 0,
  },
  signatureIdentity: {
    width: "50%",
    paddingRight: 14,
  },
  signatureRole: {
    fontSize: 6.5,
    letterSpacing: 0.5,
    color: COLORS.label,
    marginBottom: 5,
  },
  signatureName: {
    fontSize: 10,
    lineHeight: 1.3,
    color: COLORS.value,
  },
  signatureDesignation: {
    marginTop: 3,
    fontSize: 7.5,
    color: COLORS.label,
  },
  signatureSlot: {
    width: "50%",
    alignItems: "flex-end",
    paddingTop: 1,
  },
  signatureSlotLabel: {
    fontSize: 6.5,
    letterSpacing: 0.5,
    color: COLORS.label,
    marginBottom: 30,
  },
  signatureImage: { width: 150, maxHeight: 26, objectFit: "contain" },
  signatureLine: {
    width: 170,
    borderBottomWidth: 0.7,
    borderBottomColor: COLORS.frame,
  },
});

/** Normalises any value into printable text — never "null"/"undefined"/"—". */
function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";

  const raw = String(value).trim();
  if (!raw) return "";

  const normalized = raw.toLowerCase();
  if (
    raw === "—" ||
    raw === "-" ||
    normalized === "null" ||
    normalized === "undefined" ||
    normalized === "not set"
  ) {
    return "";
  }

  return raw;
}

/** True when a signature column holds image data rather than a typed name. */
function isImageSource(value: string): boolean {
  return /^(data:image\/|https?:\/\/|\/)/i.test(value);
}

/** e.g. "Thursday, September 17, 2026 12:02 PM" */
function longDateTime(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";

  return date
    .toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    // ICU renders "September 17, 2026 at 12:02 PM"; the form wants no "at".
    .replace(" at ", " ");
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function Logo() {
  if (LOGO_SRC) {
    return <Image src={LOGO_SRC} style={styles.logoImage} />;
  }

  return (
    <View style={styles.logoBox}>
      <Text style={styles.logoText}>ICT</Text>
    </View>
  );
}

function SectionBar({ title, spaced = false }: { title: string; spaced?: boolean }) {
  return (
    <View style={spaced ? [styles.sectionBar, styles.sectionBarSpaced] : styles.sectionBar}>
      <Text style={styles.sectionBarText}>{title}</Text>
    </View>
  );
}

function DetailCell({
  label,
  value,
  isLastInRow = false,
}: {
  label: string;
  value: string;
  isLastInRow?: boolean;
}) {
  return (
    <View style={isLastInRow ? [styles.cell, styles.cellRight] : styles.cell}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function NoteRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={isLast ? [styles.noteRow, styles.noteRowLast] : styles.noteRow}>
      <Text style={styles.noteLabel}>{label}</Text>
      <Text style={styles.noteValue}>{value}</Text>
    </View>
  );
}

function SignatureSlot({ source }: { source: string }) {
  const value = cell(source);

  return (
    <View style={styles.signatureSlot}>
      <Text style={styles.signatureSlotLabel}>SIGNATURE</Text>
      {isImageSource(value) ? (
        <Image src={value} style={styles.signatureImage} />
      ) : (
        <View style={styles.signatureLine} />
      )}
    </View>
  );
}

function SignatureRow({
  role,
  name,
  designation,
  signatureSource,
  isLast = false,
}: {
  role: string;
  name: string;
  designation: string;
  signatureSource: string;
  isLast?: boolean;
}) {
  return (
    <View
      style={isLast ? [styles.signatureRow, styles.signatureRowLast] : styles.signatureRow}
      wrap={false}
    >
      <View style={styles.signatureIdentity}>
        <Text style={styles.signatureRole}>{role}</Text>
        <Text style={styles.signatureName}>{cell(name)}</Text>
        <Text style={styles.signatureDesignation}>{cell(designation)}</Text>
      </View>
      <SignatureSlot source={signatureSource} />
    </View>
  );
}

export function AssetInspectionDocument({
  inspection,
}: {
  inspection: AssetInspection;
}) {
  const createdAt = parseDate(inspection.created_at);
  const recordYear = createdAt ? createdAt.getFullYear() : new Date().getFullYear();
  const generatedAt = new Date();

  const preparedByUser =
    typeof inspection.prepared_by === "number" ? null : inspection.prepared_by;

  const acceptsSpecifications = inspection.item_type?.has_specification === true;

  const adminSignature = cell(inspection.admin_signature);
  const adminSignatureIsImage = isImageSource(adminSignature);

  const userLeftRows = [
    { label: "ID", value: cell(inspection.id) },
    { label: "Username", value: cell(inspection.username) },
    { label: "Designation", value: cell(orDash(inspection.designation)) },
    {
      label: "Email / Cell",
      value: cell([inspection.email, inspection.cell].filter(Boolean).join("   |   ")),
    },
  ];

  const userRightRows = [
    { label: "Date", value: cell(formatDateTime(inspection.created_at)) },
    { label: "Department", value: cell(inspection.department?.name) },
    { label: "Territory", value: cell(orDash(inspection.territory)) },
    { label: "Status", value: cell(formatInspectionStatus(inspection.status)) },
  ];

  const assetLeftRows = [
    { label: "Asset / Item", value: cell(inspection.item_type?.name) },
    { label: "Model", value: cell(inspection.model) },
    ...(acceptsSpecifications
      ? [
          { label: "Ram", value: cell(orDash(inspection.ram)) },
          { label: "Generation", value: cell(orDash(inspection.generation)) },
        ]
      : []),
  ];

  const assetRightRows = [
    { label: "Brand", value: cell(inspection.brand) },
    { label: "Serial No", value: cell(orDash(inspection.serial_number)) },
    ...(acceptsSpecifications
      ? [{ label: "Hard Drive", value: cell(orDash(inspection.hard_drive)) }]
      : []),
    { label: "Asset Tag", value: cell(orDash(inspection.item_tag)) },
  ];

  return (
    <Document
      title={`Asset Inspection Form - ${inspection.username}`}
      author="ICT Department"
      subject="Asset Inspection Form"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Logo />

          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>ASSET INSPECTION FORM</Text>
            <Text style={styles.headerSubtitle}>ICT DEPARTMENT - {recordYear}</Text>
          </View>

          <Text style={styles.headerMeta}>{longDateTime(generatedAt)}</Text>
        </View>

        <SectionBar title="USER DETAILS" />
        <View style={styles.grid}>
          {userLeftRows.map((row, index) => (
            <DetailCell
              key={row.label}
              label={row.label}
              value={row.value}
              isLastInRow={index % 2 === 1}
            />
          ))}
          {userRightRows.map((row, index) => (
            <DetailCell
              key={row.label}
              label={row.label}
              value={row.value}
              isLastInRow={index % 2 === 1}
            />
          ))}
        </View>

        <SectionBar title="ASSET DETAILS" />
        <View style={styles.grid}>
          {assetLeftRows.map((row, index) => (
            <DetailCell
              key={row.label}
              label={row.label}
              value={row.value}
              isLastInRow={index % 2 === 1}
            />
          ))}
          {assetRightRows.map((row, index) => (
            <DetailCell
              key={row.label}
              label={row.label}
              value={row.value}
              isLastInRow={index % 2 === 1}
            />
          ))}
        </View>

        <SectionBar title="INSPECTION / RECOMMENDATION" spaced />
        <View style={styles.noteBlock}>
          <NoteRow
            label="Asset/Item Problem Identification"
            value={cell(inspection.item_problem)}
          />
          <NoteRow label="Remarks by IT department" value={cell(inspection.it_remarks)} />
          <NoteRow
            label="Remarks by Admin department"
            value={cell(inspection.admin_remarks)}
            isLast
          />
        </View>

        <SectionBar title="SIGNATURES (FOR OFFICIAL USE ONLY)" spaced />
        <View style={styles.signatureBlock}>
          <SignatureRow
            role="REPORT PREPARED BY"
            name={preparedByName(inspection)}
            designation={preparedByUser?.designation ?? ""}
            signatureSource=""
          />
          <SignatureRow
            role="USER SIGNATURE"
            name={inspection.username}
            designation={inspection.designation ?? ""}
            signatureSource={inspection.user_signature ?? ""}
          />
          <SignatureRow
            role="ADMIN DEPARTMENT"
            name={adminSignatureIsImage ? "" : adminSignature}
            designation=""
            signatureSource={adminSignatureIsImage ? adminSignature : ""}
            isLast
          />
        </View>
      </Page>
    </Document>
  );
}