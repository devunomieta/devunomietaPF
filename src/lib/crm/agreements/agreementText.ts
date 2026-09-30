import crypto from "crypto";

export const AGREEMENT_VERSION = "v1.0";
export const AGREEMENT_TITLE = "Personal Assistant Agreement & Perpetual Non-Disclosure Agreement";
export const PRINCIPAL_NAME = "Joseph Unomieta";
export const PRINCIPAL_TITLE = "Principal & Founder";

export const CANONICAL_AGREEMENT_TERMS = `
# PERSONAL ASSISTANT COLLABORATION AGREEMENT & PERPETUAL NON-DISCLOSURE AGREEMENT (NDA)
**Document Version:** ${AGREEMENT_VERSION}  
**Governing Parties:**  
- **Principal / Founder:** Joseph Unomieta ("Principal")  
- **Assistant / Collaborative Partner:** The Authorized Team Member Executing this Document ("Assistant")  

---

### ARTICLE 1: WELCOME, ENGAGEMENT & SCOPE OF RESPONSIBILITIES
1.1 **Partnership Spirit:** We believe exceptional work is built on mutual respect, clear expectations, and continuous shared growth. The Principal warmly welcomes and engages the Assistant to work alongside Joseph Unomieta as a trusted Virtual and/or Physical Personal Assistant.  
1.2 **Core Responsibilities:** Working together, the Assistant will help steer daily operations, foster client relationships, and keep workflows moving smoothly:
   (a) **Executive Support & Operations:** Co-managing business schedules, day-to-day operational workflows, appointments, and delegated executive tasks with promptness and pride;  
   (b) **CRM Stewardship:** Actively utilizing this Customer Relationship Management (CRM) platform to keep client records up-to-date, log meaningful touchpoints, and nurture prospective relationships;  
   (c) **Client Care & Communication:** Engaging prospects, leads, and paying clients with warmth, professionalism, and prompt attentiveness in full alignment with our brand ethos;  
   (d) **Social & Messaging Channels:** Managing, organizing, and curating posts across official brand and communication channels (including WhatsApp Business, LinkedIn, X/Twitter, Instagram, and official email accounts);  
   (e) **Proactive Teamwork:** Taking initiative on organizational priorities and tasks customary for a high-performing, trusted personal assistant.

---

### ARTICLE 2: ACTIVE MENTORSHIP & CONTINUOUS PERSONAL DEVELOPMENT
2.1 **Our Mentorship Promise:** We view your journey with us as an opportunity to build lifelong, high-leverage skills. The Principal is personally dedicated to mentoring you, providing structured technical guidance, industry insights, and hands-on coaching whenever you encounter new tools, methodologies, or areas you wish to strengthen.  
2.2 **Commitment to Growth:** In turn, the Assistant brings curiosity, diligence, open communication, receptiveness to constructive feedback, and a shared dedication to craftsmanship and excellence.

---

### ARTICLE 3: COMPENSATION & 15% NET PROFIT-SHARING FORMULA
3.1 **Rewarding Shared Success (15% Net Profit Share):** We win together. In addition to any agreed baseline arrangements, the Assistant is directly rewarded with **fifteen percent (15%) of the declared net profit** generated from every paying client whose account, project, or delivery the Assistant actively co-handles with the Principal.  
3.2 **Transparent Calculation (Net Profit vs. Gross Revenue):**  
   (a) **True Net Profit Basis:** To ensure healthy and sustainable business operations, the 15% share is calculated on **Net Declared Profit**, rather than the raw gross invoice amount or total funds received from the client.  
   (b) **Direct Delivery Costs Deducted First:** Before net profit is determined, all direct third-party expenses essential to delivering that client's project are deducted from the client's paid revenue. These direct costs include necessary software/API licenses, cloud hosting and servers, domain registrations, payment gateway transaction charges, external contractor fees, logistics, and direct materials.  
   (c) **Settlement & Payment Timing:** Net profit is calculated and formally declared once the client's project is successfully delivered and their invoice has been settled in full.  
   (d) **The Formula:**  
       \`Assistant Profit Share = 15% × (Gross Paid Client Revenue - Direct Delivery Costs)\`

---

### ARTICLE 4: PERPETUAL MUTUAL TRUST & CONFIDENTIALITY (NDA)
4.1 **A Foundation of Absolute Discretion:** In this close working relationship, you will have access to sensitive strategies, client records, intellectual property, financial figures, systems, and private communications. Protecting this trust is paramount.  
4.2 **What Is Protected:** "Confidential Information" includes all non-public commercial, operational, technical, financial, and personal information shared directly or observed—whether discussed **verbally, written down, viewed in databases, or seen in daily operations**.  
4.3 **Perpetual Lifetime Respect:** Because trust has no expiration date, the obligation to safeguard all Confidential Information remains **perpetual (for life)**, continuing even if our professional engagement concludes.  
4.4 **Simple Safeguards:** The Assistant agrees to handle all company and personal data with the highest standard of care:  
   (a) Never sharing, forwarding, leaking, or distributing confidential files, credentials, or client data to unauthorized third parties without prior written consent;  
   (b) Never utilizing insider knowledge for personal competing ventures or to the detriment of the Principal.  
4.5 **Legal Compulsion:** If ever required by a court order or lawful subpoena to disclose any information, the Assistant will promptly notify the Principal in writing beforehand so appropriate protective steps can be taken together.

---

### ARTICLE 5: NON-SOLICITATION & INTELLECTUAL PROPERTY
5.1 **Fair Play & Non-Solicitation:** During our collaboration and for twenty-four (24) months thereafter, the Assistant agrees not to solicit or divert clients, active leads, or key partners introduced through the Principal.  
5.2 **Work Product & Systems:** All CRM assets, templates, content, code, documentation, and client databases developed during our engagement remain the exclusive property of the Principal.

---

### ARTICLE 6: ELECTRONIC SIGNATURE & BINDING CONSENT
6.1 **Mutual Legal Accord:** By reviewing these terms and electronically submitting your verified First Name, Last Name, and Date of Birth upon your authenticated portal sign-in, you acknowledge and agree that your electronic consent represents a legally valid, intentional, and binding agreement.  
6.2 **Immutable Audit Record:** To protect both parties, your digital signature is timestamped and cryptographically logged alongside your session telemetry, creating a secure, tamper-proof record of this mutual commitment.
`.trim();

/**
 * Computes a deterministic SHA-256 hash of the canonical terms.
 */
export function getAgreementTermsHash(): string {
  return crypto.createHash("sha256").update(CANONICAL_AGREEMENT_TERMS, "utf8").digest("hex");
}
