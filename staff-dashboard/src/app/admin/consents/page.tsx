'use client';

import { useState, useEffect } from 'react';
import { getConsents } from '@/lib/api';
import jsPDF from 'jspdf';

// Hardcode the TC text to match exactly what they signed
const TC_TEXT = `GUEST DECLARATION & UNDERTAKING

At Buddha Village, we believe in harmony with nature, respect for people, and mindful living. To help us maintain a safe, peaceful, and lawful environment for everyone, we request all guests to read and sign the following declaration.

TERMS & CONDITIONS

1. I shall maintain respectful behaviour towards the property, natural surroundings, staff members, and fellow guests at all times.
2. Consumption, possession, or use of drugs, narcotics, alcohol, or any illegal substances is strictly prohibited within the premises.
3. Buddha Village shall not be held responsible for any illegal or unlawful activities carried out by any guest or member of their group.
4. Entering, swimming in, or going close to the lake is strictly prohibited. Any violation is entirely at the guest's own risk, and the management will not be liable for accidents, injuries, or loss.
5. Guests are fully responsible for any damage caused to the property, infrastructure, furnishings, or natural environment and shall bear the cost of repair or replacement.
6. The management reserves the right to deny services or ask any guest to vacate the premises without refund in case of any violation.
7. Pets are allowed only for the Day Pass package and are not permitted for overnight stays.
8. All guests must present a valid government-issued ID proof at check-in.
9. Full payment must be completed at the time of booking or check-in.
10. Guests must check out on or before the designated check-out time.
11. Eating, drinking, and smoking are strictly prohibited inside the rooms.
12. Outside food and beverages are not allowed.
13. Visitors not included in the booking are not allowed without prior management approval.
14. Quiet hours are from 10:00 PM to 7:00 AM.
15. Bonfires and outdoor activities are subject to weather conditions and management approval.
16. Children using the swimming pool must be supervised by an adult. Glass items are prohibited around the pool.
17. Guests are responsible for their personal belongings and valuables.
18. Parents/guardians are responsible for their children, pets, and baggage.
19. Please conserve electricity and water and do not litter or damage plants or wildlife.
20. Fireworks, open flames, sky lanterns, and hazardous materials are prohibited unless approved by management.
21. Parking is at the owner's risk.
22. The management may enter rooms for housekeeping, maintenance, emergencies, or safety inspections.
23. Lost and found items will be retained for a limited period; shipping costs are borne by the guest.
24. Commercial photography, filming, or drone operations require prior permission.
25. Any emergency, accident, or injury must be reported immediately.
26. By signing this declaration, guests agree to abide by all Terms & Conditions. Violation releases The Buddha Village, its owners, and staff from liability arising from such violations.`;

export default function ConsentsPage() {
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedConsent, setSelectedConsent] = useState<any | null>(null);

  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
    try {
      const data = await getConsents();
      setConsents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load consents');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = (consent: any) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Buddha Village Resort', pageWidth / 2, margin, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text('Guest Declaration & Undertaking', pageWidth / 2, margin + 8, { align: 'center' });
    
    // Guest Details Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('GUEST DETAILS', margin, margin + 25);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    let y = margin + 35;
    
    doc.text(`Full Name: ${consent.guest_name}`, margin, y);
    doc.text(`Room: ${consent.room_id}`, margin + 90, y);
    y += 8;
    
    doc.text(`Mobile Number: ${consent.mobile_number}`, margin, y);
    doc.text(`Aadhaar Number: ${consent.aadhaar_number}`, margin + 90, y);
    y += 8;
    
    doc.text(`Emergency Contact: ${consent.emergency_contact_name}`, margin, y);
    doc.text(`Emergency Phone: ${consent.emergency_contact_number}`, margin + 90, y);
    y += 15;

    // T&C Section
    doc.setFont('helvetica', 'bold');
    doc.text('TERMS & CONDITIONS', margin, y);
    y += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    // Split the text to fit the page
    const splitText = doc.splitTextToSize(TC_TEXT, pageWidth - (margin * 2));
    doc.text(splitText, margin, y);
    
    // Calculate new Y after text (approx)
    y += (splitText.length * 4) + 10;
    
    // If it runs off the page, add a new page (rough estimation)
    if (y > 250) {
      doc.addPage();
      y = margin;
    }
    
    // Signature Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SIGNATURE', margin, y);
    y += 10;
    
    doc.setFont('helvetica', 'normal');
    doc.text('I have read, understood, and agreed to all the above terms and conditions.', margin, y);
    y += 10;
    
    // Add signature image
    try {
      if (consent.signature_data) {
        doc.addImage(consent.signature_data, 'PNG', margin, y, 60, 20);
      }
    } catch (e) {
      console.error('Failed to add signature image to PDF', e);
    }
    
    y += 30;
    const dateStr = new Date(consent.agreed_at).toLocaleString();
    doc.text(`Date: ${dateStr}`, margin, y);
    doc.text(`Place: Buddha Village, Chikaballapur`, margin, y + 6);
    
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Digital Audit Trail: IP ${consent.ip_address} | Version: ${consent.tc_version}`, margin, y + 16);

    // Save PDF
    doc.save(`Declaration_${consent.room_id}_${consent.guest_name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display text-white">Guest Consents</h1>
          <p className="text-gray-400 mt-2">Digital audit trail of signed declarations</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-center py-12">Loading records...</div>
      ) : (
        <div className="bg-surface rounded-2xl border border-surface-hover overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-surface-hover text-gray-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Room & Guest</th>
                  <th className="px-6 py-4 font-medium">Contact</th>
                  <th className="px-6 py-4 font-medium">Aadhaar (Masked)</th>
                  <th className="px-6 py-4 font-medium">Signed Date</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-hover/50">
                {consents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No consent records found.
                    </td>
                  </tr>
                ) : (
                  consents.map((consent) => (
                    <tr key={consent.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white mb-1">{consent.guest_name}</div>
                        <div className="text-xs text-gold">Room {consent.room_id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div>{consent.mobile_number}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {consent.aadhaar_number}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {new Date(consent.agreed_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedConsent(consent)}
                          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors mr-2 text-xs"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => generatePDF(consent)}
                          className="bg-gold-dark/20 hover:bg-gold-dark/40 text-gold border border-gold-dark/30 px-4 py-2 rounded-lg transition-colors text-xs"
                        >
                          ↓ PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-surface-hover rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-slide-up">
            <div className="p-6 border-b border-surface-hover flex justify-between items-start">
              <div>
                <h2 className="text-xl font-display text-white mb-1">
                  Consent Record: {selectedConsent.guest_name}
                </h2>
                <p className="text-sm text-gold">Room {selectedConsent.room_id}</p>
              </div>
              <button 
                onClick={() => setSelectedConsent(null)}
                className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8">
              {/* Guest Details */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Guest Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 block">Mobile Number</span>
                    <span className="text-white">{selectedConsent.mobile_number}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Aadhaar Number</span>
                    <span className="text-white font-mono">{selectedConsent.aadhaar_number}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Emergency Contact</span>
                    <span className="text-white">{selectedConsent.emergency_contact_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Emergency Phone</span>
                    <span className="text-white">{selectedConsent.emergency_contact_number}</span>
                  </div>
                </div>
              </div>

              {/* ID Proof Image */}
              {selectedConsent.aadhaar_image && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">ID Proof Document</h3>
                  <div className="bg-black/50 p-4 rounded-xl border border-surface-hover flex justify-center">
                    <img 
                      src={selectedConsent.aadhaar_image} 
                      alt="Aadhaar ID" 
                      className="max-h-64 object-contain rounded"
                    />
                  </div>
                </div>
              )}

              {/* Signature */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Digital Signature</h3>
                <div className="bg-white rounded-xl p-4 inline-block">
                  <img 
                    src={selectedConsent.signature_data} 
                    alt="Signature" 
                    className="h-24 object-contain"
                  />
                </div>
              </div>

              {/* Audit Trail */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Audit Trail</h3>
                <div className="bg-black/30 p-4 rounded-xl border border-surface-hover font-mono text-xs text-gray-400 space-y-2">
                  <p><span className="text-gray-500">Timestamp:</span> {new Date(selectedConsent.agreed_at).toLocaleString()}</p>
                  <p><span className="text-gray-500">IP Address:</span> {selectedConsent.ip_address}</p>
                  <p><span className="text-gray-500">User Agent:</span> {selectedConsent.user_agent}</p>
                  <p><span className="text-gray-500">T&C Version:</span> {selectedConsent.tc_version}</p>
                  <p><span className="text-gray-500">Record ID:</span> {selectedConsent.id}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-surface-hover bg-black/20 flex justify-end gap-3">
              <button
                onClick={() => setSelectedConsent(null)}
                className="px-6 py-2.5 rounded-xl border border-surface-hover text-gray-300 hover:text-white hover:bg-white/5 transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={() => generatePDF(selectedConsent)}
                className="px-6 py-2.5 bg-gold-dark hover:bg-gold transition-colors text-black rounded-xl font-medium shadow-lg"
              >
                Download Legal PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
