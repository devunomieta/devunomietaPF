import crypto from "crypto";

export const AGREEMENT_VERSION = "v1.0";
export const AGREEMENT_TITLE = "Personal Assistant Agreement & Perpetual Non-Disclosure Agreement";
export const PRINCIPAL_NAME = "Joseph Unomieta";
export const PRINCIPAL_TITLE = "Principal & Founder";

export const CANONICAL_AGREEMENT_TERMS = `
# PERSONAL ASSISTANT AGREEMENT & PERPETUAL NON-DISCLOSURE AGREEMENT (NDA)
**Document Version:** ${AGREEMENT_VERSION}  
**Governing Parties:**  
- **Principal / Disclosing Party:** Joseph Unomieta ("Principal")  
- **Assistant / Receiving Party:** The Authorized Individual Executing this Document ("Assistant")  

---

### ARTICLE 1: APPOINTMENT & SCOPE OF SERVICES
1.1 **Engagement:** The Principal hereby engages the Assistant, and the Assistant accepts such engagement, to serve as a Virtual and/or Physical Personal Assistant to Joseph Unomieta.
1.2 **Scope of Responsibilities:** The Assistant's duties include, but are not limited to:
   (a) Co-managing the Principal's professional business activities, operational workflows, calendar, and delegated personal tasks;  
   (b) Planning, scheduling, organizing, delegating, and executing administrative and operational initiatives;  
   (c) Accessing this Customer Relationship Management (CRM) system to organize records, log activities, nurture contacts, and execute assigned workflows;  
   (d) Managing leads and nurturing client interactions professionally and courteously in alignment with the Principal's directives;  
   (e) Managing, organizing, and actively publishing on the Principal's official social media handles and messaging channels (including, but not limited to, WhatsApp Business, LinkedIn, X/Twitter, Instagram, and official email accounts);  
   (f) Undertaking such other activities and duties customary and suitable for a trusted Virtual/Physical Personal Assistant.

---

### ARTICLE 2: MENTORSHIP, TRAINING & PROFESSIONAL DEVELOPMENT
2.1 **Principal's Commitment:** In recognition of the Assistant's commitment to high performance, the Principal agrees to provide active mentorship, structured guidance, and training in skills, tools, systems, or technical methodologies where deficiencies, knowledge gaps, or growth opportunities are identified.  
2.2 **Diligence & Receptiveness:** The Assistant agrees to approach all training, guidance, and instructions with diligence, integrity, responsiveness, and dedication to excellence.

---

### ARTICLE 3: COMPENSATION & 15% NET PROFIT-SHARING FORMULA
3.1 **15% Net Profit Entitlement:** In consideration of the services rendered, the Assistant shall be entitled to receive **fifteen percent (15%) of the declared net profit** derived from every paying client whose account or project the Assistant actively co-handled with the Principal.  
3.2 **Net Profit Definition (Exclusion of Gross & Total Paid):**  
   (a) The 15% share is strictly calculated on **Net Declared Profit**, and **NOT** on the gross invoice amount or total gross payment received from the client.  
   (b) **Direct Service Costs Deducted:** All direct costs, expenditures, and disbursements incurred in the acquisition, execution, and delivery of the client project shall be fully deducted from gross revenue prior to profit computation. Such deductions include, without limitation: third-party software/APIs, cloud infrastructure/hosting, domain procurements, payment gateway transaction fees, external contractor fees, logistics, and direct materials.  
   (c) **Declaration at Delivery Completion:** Net profit is formally calculated, determined, and declared upon successful completion of service delivery and full final settlement of the client's invoice.  
   (d) **Formula:**  
       \`Assistant Share = 15% × (Gross Paid Revenue - Direct Service Delivery Costs)\`

---

### ARTICLE 4: PERPETUAL NON-DISCLOSURE & CONFIDENTIALITY (NDA)
4.1 **Confidential Information Defined:** "Confidential Information" encompasses any and all non-public, sensitive, commercial, financial, proprietary, technical, operational, strategic, or personal data disclosed by the Principal or accessed by the Assistant in connection with this engagement. This includes written documents, digital databases, communications, credentials, client records, financial records, ideas, and all discussions held **verbally, visually, or observed**.  
4.2 **Perpetual Lifetime Obligation:** The obligation to maintain absolute confidentiality and protect all Confidential Information is **perpetual (for life)** and shall survive the conclusion, termination, expiration, or severance of this engagement indefinitely.  
4.3 **Restrictions on Use & Disclosure:** The Assistant shall:  
   (a) Hold all Confidential Information in the strictest confidence, exercising the highest standard of care;  
   (b) Never copy, reproduce, download, screenshot, leak, or transmit Confidential Information to any third party without explicit prior written authorization from the Principal;  
   (c) Never utilize Confidential Information for personal gain, competing ventures, or to the detriment of the Principal.  
4.4 **Sole Compelled Disclosure Exception:** The Assistant may disclose Confidential Information solely to the extent strictly mandated by an order or subpoena issued by a court of competent jurisdiction, provided that the Assistant gives immediate prior written notice to the Principal to enable protective relief.

---

### ARTICLE 5: NON-SOLICITATION & INTELLECTUAL PROPERTY
5.1 **Non-Solicitation:** During the term of engagement and for a period of twenty-four (24) months following termination, the Assistant shall not directly or indirectly solicit, entice away, or transact business independently with any client, lead, customer, or partner of the Principal.  
5.2 **Work Product & Ownership:** All materials, posts, accounts, documentation, CRM records, and intellectual property produced or administered during the engagement remain the exclusive property of the Principal.

---

### ARTICLE 6: ELECTRONIC CONSENT & BINDING EXECUTION
6.1 **Legal Validity:** The Parties acknowledge that electronic execution of this Agreement—effectuated by the Assistant affirmatively checking consent and entering their verified First Name, Last Name, and Date of Birth upon authenticated portal login—constitutes a legally binding, intentional signature under applicable electronic transaction laws.  
6.2 **System Audit Logging:** The exact date, time, IP address, device telemetry, and cryptographic hash of this document are permanently recorded upon execution to establish an indisputable audit trail.
`.trim();

/**
 * Computes a deterministic SHA-256 hash of the canonical terms.
 */
export function getAgreementTermsHash(): string {
  return crypto.createHash("sha256").update(CANONICAL_AGREEMENT_TERMS, "utf8").digest("hex");
}
