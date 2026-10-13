import { pdf, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";

import type { AssetInspection } from "@/lib/api";
import { AssetInspectionDocument } from "./asset-inspection-pdf-document";

/**
 * Renders the already-fetched inspection record to a PDF and triggers a browser
 * download. Fully client-side — no extra API round trip.
 */
export async function downloadAssetInspectionPdf(
  inspection: AssetInspection
): Promise<void> {
  // `createElement` widens the result to FunctionComponentElement under React 19
  // typings, while react-pdf's pdf() expects the concrete Document element.
  const pdfDocument = createElement(AssetInspectionDocument, {
    inspection,
  }) as ReactElement<DocumentProps>;

  const blob = await pdf(pdfDocument).toBlob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `asset-inspection-${inspection.id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}