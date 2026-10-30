import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCheck,
  FileText,
  Loader2,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";

export type VeriflowReceiptData = {
  reference: string;
  submittedAt: string;
  fullName: string;
  saIdNumber: string;
  email?: string;
  occupation?: string;
  residentialAddress: string;
  bank: string;
  accountType: string;
  accountNumber: string;
  branchCode: string;
  attachments: {
    idFrontName: string;
    idBackName: string;
    selfieName: string;
    proofAddressName: string;
    bankLetterName: string;
  };
  storagePaths?: {
    idFrontPath?: string | null | undefined;
    idBackPath?: string | null | undefined;
    selfiePath?: string | null | undefined;
    proofAddressPath?: string | null | undefined;
    bankLetterPath?: string | null | undefined;
  } | undefined;
};

interface VeriflowKycDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  inlineMode?: boolean;
  userId?: string;
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
  defaultSaIdNumber?: string;
  defaultResidentialAddress?: string;
  defaultBank?: string;
  defaultAccountType?: string;
  defaultAccountNumber?: string;
  defaultBranchCode?: string;
  correctionNotice?: {
    reason: string;
    reasonsList?: string[];
  } | null;
  receiptData: VeriflowReceiptData | null;
  onComplete: (receipt: VeriflowReceiptData) => Promise<void> | void;
}

export function VeriflowKycDialog({
  open = false,
  onOpenChange = () => {},
  inlineMode = false,
  userId,
  defaultName = "",
  defaultEmail = "",
  defaultPhone = "",
  defaultSaIdNumber = "",
  defaultResidentialAddress = "",
  defaultBank = "Capitec Bank",
  defaultAccountType = "Savings",
  defaultAccountNumber = "",
  defaultBranchCode = "470010",
  correctionNotice = null,
  receiptData,
  onComplete,
}: VeriflowKycDialogProps) {
  // Wizard steps: 1: Personal & Identity, 2: Settlement Account, 3: Document Attachments, 4: Receipt view
  // If correction requested on documents, jump straight to step 3 so the user only uploads the needed document!
  const [step, setStep] = useState<1 | 2 | 3 | "receipt">(
    receiptData ? "receipt" : correctionNotice ? 3 : 1
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState(defaultName || "");
  const [saIdNumber, setSaIdNumber] = useState(defaultSaIdNumber || "");
  const [residentialAddress, setResidentialAddress] = useState(defaultResidentialAddress || "");

  const [bank, setBank] = useState(defaultBank || "Capitec Bank");
  const [accountType, setAccountType] = useState(defaultAccountType || "Savings");
  const [accountNumber, setAccountNumber] = useState(defaultAccountNumber || "");
  const [branchCode, setBranchCode] = useState(defaultBranchCode || "470010");

  // Real files uploaded by user
  const [files, setFiles] = useState<{
    idFront: File | null;
    idBack: File | null;
    selfie: File | null;
    proofAddress: File | null;
    bankLetter: File | null;
  }>({
    idFront: null,
    idBack: null,
    selfie: null,
    proofAddress: null,
    bankLetter: null,
  });

  const formatFileSize = (file: File | null) => {
    if (!file) return "";
    const bytes = file.size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const activeReceipt: VeriflowReceiptData = receiptData ?? {
    reference: "ZA-I6JGA",
    submittedAt: "Pending Submission",
    fullName: fullName || "Panelist",
    saIdNumber: saIdNumber || "RSA Verified",
    email: defaultEmail || "",
    residentialAddress: residentialAddress || "Physical Address Lodged",
    bank: bank || "South African Bank",
    accountType: accountType || "Savings",
    accountNumber: accountNumber ? `••••${accountNumber.slice(-4)}` : "Verified",
    branchCode: branchCode || "470010",
    attachments: {
      idFrontName: files.idFront?.name || "Pending",
      idBackName: files.idBack?.name || "Optional / Exempt",
      selfieName: files.selfie?.name || "Pending",
      proofAddressName: files.proofAddress?.name || "Optional",
      bankLetterName: files.bankLetter?.name || "Optional",
    },
  };

  const handleSubmit = async () => {
    if (!fullName.trim() || fullName.trim().length < 3) {
      toast.error("Please enter your full legal name as registered with DHA.");
      setStep(1);
      return;
    }
    if (!saIdNumber.trim() || saIdNumber.replace(/\D/g, "").length !== 13) {
      toast.error("Please enter a valid 13-digit South African ID Number.");
      setStep(1);
      return;
    }
    if (!residentialAddress.trim()) {
      toast.error("Please enter your residential physical address.");
      setStep(1);
      return;
    }
    if (!residentialAddress.trim()) {
      toast.error("Please enter your residential physical address.");
      setStep(1);
      return;
    }
    if (!bank.trim()) {
      toast.error("Please specify your South African bank name.");
      setStep(2);
      return;
    }
    if (!accountNumber.trim() || accountNumber.replace(/\D/g, "").length < 6) {
      toast.error("Please enter a valid bank account number.");
      setStep(2);
      return;
    }
    if (!files.idFront) {
      toast.error("Document 1: Please upload your Identity Document (Front).");
      return;
    }
    if (!files.idBack) {
      toast.error("Document 2: Please upload your Identity Document (Back / Barcode side).");
      return;
    }
    if (!files.selfie) {
      toast.error("Document 3: Please upload a selfie holding your Identity Document.");
      return;
    }
    if (!files.proofAddress) {
      toast.error("Document 4: Please upload your Proof of Residential Address (PDF, photo, or utility bill).");
      return;
    }
    if (!files.bankLetter) {
      toast.error("Document 5: Please upload your Bank Confirmation Letter, Statement, or Banking app screenshot.");
      return;
    }

    setIsSubmitting(true);
    try {
      let resolvedUserId = userId;
      if (!resolvedUserId) {
        const { data: authData } = await supabase.auth.getUser();
        resolvedUserId = authData.user?.id;
      }
      if (!resolvedUserId) {
        throw new Error("Sessão de usuário não identificada. Por favor, faça login novamente.");
      }

      // Upload all real files to Supabase Storage under 'kyc' bucket
      const uploadedPaths: Record<string, string | null> = {
        idFrontPath: null,
        idBackPath: null,
        selfiePath: null,
        proofAddressPath: null,
        bankLetterPath: null,
      };

      const fileEntries: Array<[keyof typeof files, string]> = [
        ["idFront", "idFrontPath"],
        ["idBack", "idBackPath"],
        ["selfie", "selfiePath"],
        ["proofAddress", "proofAddressPath"],
        ["bankLetter", "bankLetterPath"],
      ];

      for (const [key, fieldName] of fileEntries) {
        const file = files[key];
        if (!file) continue;
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const path = `${resolvedUserId}/${Date.now()}-${key}-${cleanName}`;
        const { error: uploadError } = await supabase.storage.from("kyc").upload(path, file, {
          upsert: true,
          contentType: file.type || "application/octet-stream",
        });
        if (uploadError) {
          console.error("Storage upload error for", key, uploadError);
          throw new Error(`Falha no upload do arquivo (${file.name}): ${uploadError.message || "Erro no servidor"}`);
        }
        uploadedPaths[fieldName] = path;
      }

      if (
        !uploadedPaths.idFrontPath ||
        !uploadedPaths.idBackPath ||
        !uploadedPaths.selfiePath ||
        !uploadedPaths.proofAddressPath ||
        !uploadedPaths.bankLetterPath
      ) {
        throw new Error("Um ou mais documentos falharam no envio. Por favor, tente novamente.");
      }

      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const randomRef = "ZA-" + Math.random().toString(36).substring(2, 7).toUpperCase();

      const newReceipt: VeriflowReceiptData = {
        reference: randomRef,
        submittedAt: `${dateStr} ${timeStr} SAST`,
        fullName: fullName || defaultName || "Verified Applicant",
        saIdNumber: saIdNumber || "Verified SA Citizen",
        email: defaultEmail || "",
        residentialAddress: residentialAddress || "Address Lodged in Dossier",
        bank: bank || "South African Bank",
        accountType: accountType || "Savings",
        accountNumber: accountNumber ? `••••${accountNumber.slice(-4)}` : "Verified",
        branchCode: branchCode || "470010",
        attachments: {
          idFrontName: files.idFront.name,
          idBackName: files.idBack?.name || (files.idFront ? "Included / Barcode Verified" : "Not provided"),
          selfieName: files.selfie?.name || (files.idFront ? "Biometric Live Match Lodged" : "Not provided"),
          proofAddressName: files.proofAddress?.name || "Not provided (Standard Tier)",
          bankLetterName: files.bankLetter?.name || "Not provided (Bank API Verified)",
        },
        storagePaths: {
          idFrontPath: uploadedPaths.idFrontPath,
          idBackPath: uploadedPaths.idBackPath,
          selfiePath: uploadedPaths.selfiePath,
          proofAddressPath: uploadedPaths.proofAddressPath,
          bankLetterPath: uploadedPaths.bankLetterPath,
        },
      };

      await onComplete(newReceipt);
      setStep("receipt");
      toast.success("Identity verification submitted successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit documents.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const mainContent = (
    <div className="w-full max-w-xl mx-auto rounded-3xl border border-border/80 shadow-soft overflow-hidden bg-card">
      {/* Platform Brand Header */}
      <div className="bg-hero text-white p-4 sm:p-5 flex items-center justify-between border-b border-primary/30">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-white/15 text-white flex items-center justify-center font-black text-sm border border-white/20 shadow-xs">
              <ShieldCheck className="size-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base sm:text-lg leading-tight text-white flex items-center gap-1.5">
                Identity &amp; FICA Clearance
                <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/40 text-[9px] font-bold py-0">
                  Official Verification
                </Badge>
              </h3>
              <p className="text-[11px] text-white/80">Google Opinion Rewards · Bank Release Compliance</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-white/70 uppercase tracking-wider block font-semibold">Reference</span>
            <span className="font-mono text-xs sm:text-sm font-bold text-white">
              {step === "receipt" || receiptData ? activeReceipt.reference : "NEW-VERIF"}
            </span>
          </div>
        </div>

        {/* Wizard Body */}
        {step !== "receipt" && !receiptData ? (
          <div className="p-4 sm:p-6 space-y-5">
            {/* Step Progress Pills */}
            <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-muted-foreground border-b border-border pb-3">
              <span className={step === 1 ? "text-primary font-bold" : ""}>1. Personal Details</span>
              <span>›</span>
              <span className={step === 2 ? "text-primary font-bold" : ""}>2. Settlement Bank</span>
              <span>›</span>
              <span className={step === 3 ? "text-primary font-bold" : ""}>3. Document Uploads</span>
            </div>

            {/* STEP 1: Personal & Identity */}
            {step === 1 ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
                  Enter your official legal identity as registered with the Department of Home Affairs (DHA) to confirm bank settlement eligibility.
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Full Legal Name</Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Sipho Nkosi"
                      className="h-10 text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">South African ID Number</Label>
                    <Input
                      value={saIdNumber}
                      onChange={(e) => setSaIdNumber(e.target.value)}
                      placeholder="e.g. 910402 0520 087"
                      className="h-10 text-xs sm:text-sm font-mono"
                      maxLength={15}
                    />
                    <p className="text-[10px] text-muted-foreground">13-digit Republic of South Africa national identity number</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Residential Address</Label>
                    <Input
                      value={residentialAddress}
                      onChange={(e) => setResidentialAddress(e.target.value)}
                      placeholder="e.g. 2457 Main Road, Johannesburg, Gauteng"
                      className="h-10 text-xs sm:text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">Your physical residential address for SARB FICA compliance</p>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 shadow-soft"
                    onClick={() => {
                      if (!fullName.trim() || fullName.trim().length < 3) {
                        toast.error("Please enter your full legal name.");
                        return;
                      }
                      if (!saIdNumber.trim() || saIdNumber.replace(/\D/g, "").length !== 13) {
                        toast.error("Please enter a valid 13-digit South African ID Number.");
                        return;
                      }
                      if (!residentialAddress.trim()) {
                        toast.error("Please enter your residential physical address.");
                        return;
                      }
                      setStep(2);
                    }}
                  >
                    Continue to Settlement Account ›
                  </Button>
                </div>
              </div>
            ) : null}

            {/* STEP 2: Settlement Account */}
            {step === 2 ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs text-muted-foreground leading-relaxed">
                  Verify the South African bank account designated to receive your <strong>R 4,000.00</strong> payout.
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Bank Name</Label>
                    <Input
                      value={bank}
                      onChange={(e) => setBank(e.target.value)}
                      placeholder="e.g. Capitec Bank, FNB, Standard Bank, Absa, Nedbank"
                      className="h-10 text-xs sm:text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Account Type</Label>
                      <Input
                        value={accountType}
                        onChange={(e) => setAccountType(e.target.value)}
                        placeholder="Savings"
                        className="h-10 text-xs sm:text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Branch Code</Label>
                      <Input
                        value={branchCode}
                        onChange={(e) => setBranchCode(e.target.value)}
                        placeholder="470010"
                        className="h-10 text-xs sm:text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Account Number</Label>
                    <Input
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="e.g. 1382447556"
                      className="h-10 text-xs sm:text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="w-1/3 h-11" onClick={() => setStep(1)}>
                    ‹ Back
                  </Button>
                  <Button
                    className="w-2/3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 shadow-soft"
                    onClick={() => {
                      if (!bank.trim()) {
                        toast.error("Please enter or select your bank name.");
                        return;
                      }
                      if (!accountNumber.trim() || accountNumber.replace(/\D/g, "").length < 6) {
                        toast.error("Please enter a valid bank account number.");
                        return;
                      }
                      if (!branchCode.trim()) {
                        toast.error("Please enter your bank branch code.");
                        return;
                      }
                      setStep(3);
                    }}
                  >
                    Continue to Document Uploads ›
                  </Button>
                </div>
              </div>
            ) : null}

            {/* STEP 3: Real Document Uploads (5) */}
            {step === 3 ? (
              <div className="space-y-4">
                {correctionNotice ? (
                  <div className="rounded-xl border-2 border-destructive/50 bg-destructive/10 p-4 space-y-2 animate-in fade-in">
                    <div className="flex items-center gap-2 text-destructive font-black text-xs uppercase tracking-wide">
                      <AlertTriangle className="size-4 shrink-0 text-destructive animate-pulse" />
                      <span>Document Correction Required by Compliance</span>
                    </div>
                    <p className="text-xs text-foreground font-semibold leading-relaxed">
                      &quot;{correctionNotice.reason}&quot;
                    </p>
                    {correctionNotice.reasonsList && correctionNotice.reasonsList.length > 0 ? (
                      <ul className="text-[11px] text-destructive-foreground/90 list-disc list-inside space-y-0.5 pt-1 border-t border-destructive/20 font-medium">
                        {correctionNotice.reasonsList.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="text-[11px] text-muted-foreground pt-0.5">
                      Your identity and bank details remain saved below. Please attach the requested document(s) and submit to release your payout.
                    </p>
                  </div>
                ) : null}

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Upload Your FICA Compliance Documents</strong> (official verification required by the South African Reserve Bank for payout release):
                </div>

                <div className="space-y-2.5">
                  {[
                    {
                      key: "idFront" as const,
                      num: "1",
                      title: "Identity Document — Front",
                      subtitle: "SA Smart ID Card (Front), Green ID Book, or Passport",
                      required: true,
                      accept: "image/*,.pdf,application/pdf",
                      capture: undefined,
                    },
                    {
                      key: "idBack" as const,
                      num: "2",
                      title: "Identity Document — Back",
                      subtitle: "Barcode side of Smart ID Card or ID Book",
                      required: true,
                      accept: "image/*,.pdf,application/pdf",
                      capture: undefined,
                    },
                    {
                      key: "selfie" as const,
                      num: "3",
                      title: "Selfie Holding Identity Document",
                      subtitle: "Clear photo of your face holding your ID document",
                      required: true,
                      accept: "image/*",
                      capture: "user" as const,
                    },
                    {
                      key: "proofAddress" as const,
                      num: "4",
                      title: "Proof of Residential Address",
                      subtitle: "Utility bill, municipal rates, lease, or photo of address document",
                      required: true,
                      formatBadge: "PDF / Photo",
                      accept: "image/*,.pdf,application/pdf",
                      capture: undefined,
                    },
                    {
                      key: "bankLetter" as const,
                      num: "5",
                      title: "Bank Confirmation Letter / Statement",
                      subtitle: "Bank confirmation letter, statement PDF, or banking app screenshot",
                      required: true,
                      formatBadge: "PDF / Screenshot",
                      accept: "image/*,.pdf,application/pdf",
                      capture: undefined,
                    },
                  ].map((doc) => (
                    <div
                      key={doc.key}
                      className="rounded-xl border border-border p-3 space-y-2 bg-card transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-foreground">
                              {doc.num}. {doc.title}
                            </p>
                            {doc.required ? (
                              <Badge variant="outline" className="text-[9px] text-destructive border-destructive/40 py-0">
                                Required
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] text-muted-foreground border-border/80 py-0">
                                Optional
                              </Badge>
                            )}
                            {"formatBadge" in doc && doc.formatBadge ? (
                              <Badge className="text-[9px] bg-primary/10 text-primary border border-primary/20 py-0 font-bold">
                                {doc.formatBadge}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-muted-foreground">{doc.subtitle}</p>
                        </div>

                        {files[doc.key] ? (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] shrink-0 flex items-center gap-1"
                          >
                            <CheckCircle2 className="size-3" /> Selected
                          </Badge>
                        ) : null}
                      </div>

                      {/* File Selection Controls */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                        {files[doc.key] ? (
                          <div className="flex items-center justify-between w-full gap-2">
                            <div className="min-w-0 flex-1 flex items-center gap-1.5 text-xs text-foreground font-mono">
                              <FileCheck className="size-3.5 text-emerald-500 shrink-0" />
                              <span className="truncate">{files[doc.key]?.name}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                ({formatFileSize(files[doc.key])})
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <label
                                htmlFor={`vf-upload-${doc.key}`}
                                className="cursor-pointer text-[11px] font-semibold text-primary hover:underline px-1.5 py-0.5"
                              >
                                Replace
                              </label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => setFiles((prev) => ({ ...prev, [doc.key]: null }))}
                              >
                                <X className="size-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[11px] text-muted-foreground italic">
                              {"formatBadge" in doc ? "No PDF or photo attached yet" : "No document attached yet"}
                            </span>
                            <label
                              htmlFor={`vf-upload-${doc.key}`}
                              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-secondary/60 hover:bg-secondary text-xs font-semibold text-foreground transition-colors shadow-xs"
                            >
                              <Upload className="size-3.5 text-muted-foreground" />
                              <span>{doc.key === "selfie" ? "Take / Upload Photo" : "Select Document"}</span>
                            </label>
                          </div>
                        )}
                        <input
                          id={`vf-upload-${doc.key}`}
                          type="file"
                          accept={doc.accept}
                          capture={doc.capture}
                          className="hidden"
                          onChange={(e) => {
                            const selected = e.target.files?.[0] ?? null;
                            if (selected) {
                              setFiles((prev) => ({ ...prev, [doc.key]: selected }));
                              toast.success(`Attached ${selected.name}`);
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="w-1/3 h-11" onClick={() => setStep(2)}>
                    ‹ Back
                  </Button>
                  <Button
                    className="w-2/3 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs sm:text-sm h-11 shadow-soft"
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-2" /> Uploading FICA Documents...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="size-4 mr-1.5" /> Submit FICA & Generate Receipt
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          /* STEP 4 / FINAL: OFFICIAL VERIFLOW COMPLIANCE RECEIPT */
          <div className="p-4 sm:p-6 space-y-5 bg-card">
            {/* Header info */}
            <div className="border-b border-border pb-4 space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display font-extrabold text-xl text-foreground">
                    {activeReceipt.fullName}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Individual applicant · Submitted {activeReceipt.submittedAt}
                  </p>
                </div>
                <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold text-xs bg-amber-500/10">
                  Awaiting review
                </Badge>
              </div>
            </div>

            {/* Applicant & Completed Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border-b border-border pb-4">
              <div className="space-y-1.5">
                <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block">
                  APPLICANT
                </span>
                <div className="flex justify-between text-foreground">
                  <span className="text-muted-foreground">Applicant type</span>
                  <span className="font-semibold">Individual</span>
                </div>
                <div className="flex justify-between text-foreground">
                  <span className="text-muted-foreground">Full name</span>
                  <span className="font-semibold">{activeReceipt.fullName}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block">
                  COMPLETED STEPS
                </span>
                <div className="flex justify-between text-foreground">
                  <span>1. Personal Details</span>
                  <span className="text-emerald-600 font-bold">Completed</span>
                </div>
                <div className="flex justify-between text-foreground">
                  <span>2. Settlement Bank</span>
                  <span className="text-emerald-600 font-bold">Completed</span>
                </div>
                <div className="flex justify-between text-foreground">
                  <span>3. Document Uploads</span>
                  <span className="text-emerald-600 font-bold">Completed</span>
                </div>
                <div className="flex justify-between text-foreground">
                  <span>4. Final Review</span>
                  <span className="text-emerald-600 font-bold">Completed</span>
                </div>
              </div>
            </div>

            {/* Identity & Settlement Account */}
            <div className="space-y-3 text-xs border-b border-border pb-4">
              <div>
                <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block mb-1.5">
                  IDENTITY
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Full name</span>
                    <span className="font-semibold text-foreground">{activeReceipt.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SA ID number</span>
                    <span className="font-semibold font-mono text-foreground">{activeReceipt.saIdNumber}</span>
                  </div>
                </div>
                <div className="mt-2 pt-1 border-t border-border/50 text-[11px]">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Residential address</span>
                  <span className="font-semibold text-foreground">{activeReceipt.residentialAddress}</span>
                </div>
              </div>

              <div className="pt-2">
                <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block mb-1.5">
                  SETTLEMENT ACCOUNT
                </span>
                <div className="grid grid-cols-2 gap-y-1 gap-x-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank</span>
                    <span className="font-semibold text-foreground">{activeReceipt.bank}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account type</span>
                    <span className="font-semibold text-foreground">{activeReceipt.accountType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account number</span>
                    <span className="font-semibold font-mono text-foreground">{activeReceipt.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Branch code</span>
                    <span className="font-semibold font-mono text-foreground">{activeReceipt.branchCode}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Attachments (5) */}
            <div className="space-y-1.5 text-xs border-b border-border pb-4">
              <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block">
                ATTACHMENTS (5)
              </span>
              <div className="space-y-1 text-muted-foreground text-[11px]">
                <div className="flex justify-between items-center py-0.5">
                  <span>Identity document — front</span>
                  <span className="font-mono text-foreground font-semibold">{activeReceipt.attachments.idFrontName}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span>Identity document — back</span>
                  <span className="font-mono text-foreground font-semibold">{activeReceipt.attachments.idBackName}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span>Selfie holding identity document</span>
                  <span className="font-mono text-foreground font-semibold">{activeReceipt.attachments.selfieName}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span>Proof of residential address</span>
                  <span className="font-mono text-foreground font-semibold">{activeReceipt.attachments.proofAddressName}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span>Bank confirmation letter</span>
                  <span className="font-mono text-foreground font-semibold">{activeReceipt.attachments.bankLetterName}</span>
                </div>
              </div>
            </div>

            {/* Footer Legal Disclaimer */}
            <p className="text-[10px] text-muted-foreground leading-relaxed italic text-center">
              Processed in line with FICA and POPIA Regulations. This receipt confirms document lodgement with Google Opinion Rewards.
            </p>

            {/* Action Buttons: single full-width button to return to payout clearance */}
            <div className="pt-2">
              <Button
                asChild
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm h-12 shadow-soft flex items-center justify-center gap-2"
              >
                <Link to="/payout-setup">
                  <span>Return to Payout Status</span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
    </div>
  );

  if (inlineMode) {
    return mainContent;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-xl p-0 max-h-[92dvh] overflow-y-auto rounded-2xl border-0 shadow-2xl bg-background">
        {mainContent}
      </DialogContent>
    </Dialog>
  );
}
