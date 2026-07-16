'use client';

import { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { submitConsent } from '@/lib/api';

const TC_VERSION = 'v1.0';

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

interface GuestDeclarationProps {
  roomId: string;
  guestName: string;
  onComplete: () => void;
}

export default function GuestDeclaration({ roomId, guestName, onComplete }: GuestDeclarationProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Details
  const [mobile, setMobile] = useState('');
  const [ecName, setEcName] = useState('');
  const [ecNumber, setEcNumber] = useState('');

  // Step 2: Aadhaar
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarImage, setAadhaarImage] = useState('');

  // Step 3: T&C Scroll
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const tcScrollRef = useRef<HTMLDivElement>(null);

  // Step 4: Signature
  const sigCanvas = useRef<SignatureCanvas>(null);

  const handleScroll = () => {
    if (!tcScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = tcScrollRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      setHasScrolledToBottom(true);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAadhaarImage(reader.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (sigCanvas.current?.isEmpty()) {
      setError('Please provide your signature.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const signatureData = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png') || '';

      const { session_token } = await submitConsent({
        room_id: roomId,
        guest_name: guestName,
        mobile_number: mobile,
        emergency_contact_name: ecName,
        emergency_contact_number: ecNumber,
        aadhaar_number: aadhaarNumber,
        aadhaar_image: aadhaarImage || undefined,
        signature_data: signatureData,
        tc_version: TC_VERSION,
      });

      // Save token to skip this next time
      localStorage.setItem(`session_${roomId}`, session_token);
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to submit declaration. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto relative animate-fade-in">
      <div className="p-6 pb-4 border-b border-surface">
        <h1 className="font-display text-xl text-foreground text-center">Guest Declaration</h1>
        <div className="flex gap-2 justify-center mt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-1.5 w-12 rounded-full ${step >= i ? 'bg-gold' : 'bg-surface'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-24">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        {/* --- Step 1: Details --- */}
        {step === 1 && (
          <div className="space-y-6 animate-slide-up">
            <div>
              <h2 className="text-lg font-medium text-foreground mb-1">Your Details</h2>
              <p className="text-sm text-foreground-muted mb-6">We need a few details before you proceed.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-2 uppercase tracking-wider">Mobile Number</label>
                <input 
                  type="tel"
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  placeholder="e.g., +91 9876543210"
                  className="w-full px-4 py-3 bg-background-alt border border-surface rounded-xl focus:outline-none focus:border-gold/50 text-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-2 uppercase tracking-wider">Emergency Contact Name</label>
                <input 
                  type="text"
                  value={ecName}
                  onChange={e => setEcName(e.target.value)}
                  placeholder="e.g., Jane Doe"
                  className="w-full px-4 py-3 bg-background-alt border border-surface rounded-xl focus:outline-none focus:border-gold/50 text-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-2 uppercase tracking-wider">Emergency Contact Number</label>
                <input 
                  type="tel"
                  value={ecNumber}
                  onChange={e => setEcNumber(e.target.value)}
                  placeholder="e.g., +91 9876543211"
                  className="w-full px-4 py-3 bg-background-alt border border-surface rounded-xl focus:outline-none focus:border-gold/50 text-foreground"
                />
              </div>
            </div>

            <button 
              onClick={() => {
                if (!mobile || !ecName || !ecNumber) {
                  setError('Please fill in all fields.');
                  return;
                }
                setError('');
                setStep(2);
              }}
              className="w-full py-4 bg-foreground text-background rounded-xl font-medium mt-8 shadow-lg hover:shadow-xl transition-all"
            >
              Continue to ID Verification
            </button>
          </div>
        )}

        {/* --- Step 2: Aadhaar --- */}
        {step === 2 && (
          <div className="space-y-6 animate-slide-up">
            <div>
              <h2 className="text-lg font-medium text-foreground mb-1">ID Verification</h2>
              <p className="text-sm text-foreground-muted mb-6">Please provide your Aadhaar Card details.</p>
            </div>

            <div className="space-y-6">
              <div className="p-5 border border-dashed border-surface-hover rounded-2xl bg-surface/30">
                <label className="block text-sm font-medium text-foreground mb-3 text-center">
                  Option 1: Upload Photo
                </label>
                <div className="flex justify-center">
                  <label className="cursor-pointer bg-background-alt hover:bg-surface border border-surface px-6 py-3 rounded-xl transition-colors flex items-center gap-2 text-sm text-foreground font-medium">
                    <span>📷</span> Choose File
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
                {aadhaarImage && <p className="text-center text-emerald-400 text-xs mt-3">✓ Image uploaded</p>}
              </div>

              <div className="text-center text-sm text-foreground-muted font-medium">OR</div>

              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-2 uppercase tracking-wider text-center">
                  Option 2: Enter Number Manually
                </label>
                <input 
                  type="text"
                  value={aadhaarNumber}
                  onChange={e => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="12-digit Aadhaar Number"
                  className="w-full px-4 py-4 text-center tracking-widest text-lg bg-background-alt border border-surface rounded-xl focus:outline-none focus:border-gold/50 text-foreground"
                />
              </div>
            </div>

            <button 
              onClick={() => {
                if (!aadhaarImage && aadhaarNumber.length !== 12) {
                  setError('Please either upload an image OR enter a valid 12-digit Aadhaar number.');
                  return;
                }
                setError('');
                setStep(3);
              }}
              className="w-full py-4 bg-foreground text-background rounded-xl font-medium mt-8 shadow-lg hover:shadow-xl transition-all"
            >
              Continue to Terms
            </button>
            <button onClick={() => setStep(1)} className="w-full py-4 text-sm text-foreground-muted hover:text-foreground">
              Back
            </button>
          </div>
        )}

        {/* --- Step 3: Terms --- */}
        {step === 3 && (
          <div className="space-y-6 animate-slide-up flex flex-col h-[70vh]">
            <div>
              <h2 className="text-lg font-medium text-foreground mb-1">Terms & Conditions</h2>
              <p className="text-sm text-foreground-muted mb-4">Please read carefully before signing.</p>
            </div>

            <div 
              ref={tcScrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto bg-background-alt border border-surface rounded-xl p-5 text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed shadow-inner"
            >
              {TC_TEXT}
            </div>

            {!hasScrolledToBottom && (
              <p className="text-xs text-center text-gold animate-pulse">
                Scroll to the bottom to continue ↓
              </p>
            )}

            <button 
              disabled={!hasScrolledToBottom}
              onClick={() => setStep(4)}
              className={`w-full py-4 rounded-xl font-medium transition-all ${
                hasScrolledToBottom 
                  ? 'bg-foreground text-background shadow-lg' 
                  : 'bg-surface text-foreground-muted opacity-50 cursor-not-allowed'
              }`}
            >
              Proceed to Sign
            </button>
          </div>
        )}

        {/* --- Step 4: Signature --- */}
        {step === 4 && (
          <div className="space-y-6 animate-slide-up">
            <div>
              <h2 className="text-lg font-medium text-foreground mb-1">Sign Declaration</h2>
              <p className="text-sm text-foreground-muted mb-6">Draw your signature below.</p>
            </div>

            <div className="bg-white rounded-xl overflow-hidden border border-surface shadow-inner">
              <SignatureCanvas 
                ref={sigCanvas}
                penColor="black"
                canvasProps={{className: 'w-full h-48 sm:h-64 cursor-crosshair'}} 
              />
            </div>
            
            <div className="flex justify-between items-center px-1">
              <div className="text-xs text-foreground-muted">
                <p>Date: {new Date().toLocaleDateString()}</p>
                <p>Place: Buddha Village, Chikaballapur</p>
              </div>
              <button 
                onClick={() => sigCanvas.current?.clear()}
                className="text-sm text-red-400 hover:text-red-300 px-3 py-1 rounded border border-red-500/20"
              >
                Clear
              </button>
            </div>

            <button 
              disabled={isSubmitting}
              onClick={handleSubmit}
              className={`w-full py-4 mt-8 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                isSubmitting ? 'bg-gold-dark/50 text-white cursor-wait' : 'bg-gold-dark text-background hover:bg-gold-dark/90 shadow-lg'
              }`}
            >
              {isSubmitting ? 'Saving...' : 'I Agree & Continue'}
            </button>
            <button onClick={() => setStep(3)} className="w-full py-4 text-sm text-foreground-muted hover:text-foreground">
              Back to Terms
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
