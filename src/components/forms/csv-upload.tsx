"use client";

import * as React from "react";
import Papa from "papaparse";
import {
  Upload,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { CSVParseResult, CSVInviteeRow } from "@/types/domain.types";
import { cn } from "@/lib/utils";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email?.trim() ?? "");
}

export interface CSVUploadProps {
  onParsed: (result: CSVParseResult) => void;
  requiredColumns: string[];
  existingEmails?: string[];
  templateHeaders?: string[];
}

const DEFAULT_TEMPLATE_HEADERS = [
  "name",
  "email",
  "phone",
  "company",
  "title",
  "ticket_type",
  "tag",
];

function CSVUpload({
  onParsed,
  requiredColumns,
  existingEmails = [],
  templateHeaders = DEFAULT_TEMPLATE_HEADERS,
}: CSVUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [result, setResult] = React.useState<CSVParseResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const existingSet = React.useMemo(
    () => new Set(existingEmails.map((e) => e.toLowerCase().trim())),
    [existingEmails]
  );

  const parseFile = React.useCallback(
    (file: File) => {
      setError(null);
      setResult(null);

      if (!file.name.endsWith(".csv")) {
        setError("Please upload a CSV file.");
        return;
      }

      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          const rows = res.data;
          const headers = res.meta.fields ?? [];
          const missing = requiredColumns.filter(
            (col) => !headers.some((h) => h.toLowerCase().trim() === col.toLowerCase())
          );

          if (missing.length > 0) {
            setError(
              `Missing required columns: ${missing.join(", ")}. Template includes: ${templateHeaders.join(", ")}`
            );
            return;
          }

          const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
          const colMap: Record<string, string> = {};
          requiredColumns.forEach((rc) => {
            const idx = normalizedHeaders.indexOf(rc.toLowerCase());
            colMap[rc] = headers[idx] ?? rc;
          });

          const valid: CSVInviteeRow[] = [];
          const invalid: { row: number; data: Record<string, string>; errors: string[] }[] = [];
          const duplicates: CSVInviteeRow[] = [];
          const alreadyInvited: CSVInviteeRow[] = [];
          const seenEmails = new Set<string>();

          rows.forEach((raw, i) => {
            const rowNum = i + 2;
            const row: Record<string, string> = {};
            const errors: string[] = [];

            requiredColumns.forEach((col) => {
              const headerKey = colMap[col];
              const val = raw[headerKey]?.trim() ?? "";
              row[col] = val;
            });

            const email = (row.email ?? "").toLowerCase();
            if (!email) {
              errors.push("Email is required");
            } else if (!isValidEmail(email)) {
              errors.push("Invalid email format");
            }

            if (requiredColumns.includes("name") && !(row.name ?? "").trim()) {
              errors.push("Name is required");
            }

            const inviteeRow: CSVInviteeRow = {
              name: row.name ?? "",
              email: email,
              phone: row.phone,
              company: row.company,
              title: row.title,
              ticket_type: row.ticket_type,
              tag: row.tag,
            };

            if (errors.length > 0) {
              invalid.push({ row: rowNum, data: raw, errors });
              return;
            }

            if (seenEmails.has(email)) {
              duplicates.push(inviteeRow);
              return;
            }
            seenEmails.add(email);

            if (existingSet.has(email)) {
              alreadyInvited.push(inviteeRow);
              return;
            }

            valid.push(inviteeRow);
          });

          const parseResult: CSVParseResult = {
            valid,
            invalid,
            duplicates,
            already_invited: alreadyInvited,
            total: rows.length,
          };

          setResult(parseResult);
          onParsed(parseResult);
        },
      });
    },
    [requiredColumns, existingSet, templateHeaders, onParsed]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = "";
  };

  const downloadTemplate = () => {
    const csv = Papa.unparse([
      templateHeaders.reduce((acc, h) => ({ ...acc, [h]: "" }), {}),
    ]);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invitees_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <Upload className="size-10 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">
            Drag and drop your CSV here, or click to browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Required columns: {requiredColumns.join(", ")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={downloadTemplate}
        >
          <Download className="mr-2 size-4" />
          Download template
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {result && !error && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-muted-foreground" />
              <span className="font-medium">Preview</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default" className="gap-1">
                <CheckCircle className="size-3" />
                Valid: {result.valid.length}
              </Badge>
              {result.invalid.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="size-3" />
                  Invalid: {result.invalid.length}
                </Badge>
              )}
              {result.duplicates.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  Duplicates: {result.duplicates.length}
                </Badge>
              )}
              {result.already_invited.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  Already invited: {result.already_invited.length}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { CSVUpload };
