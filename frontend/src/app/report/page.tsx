'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { formatCategory } from '../../lib/utils';
import { StatusBadge } from '../../components/StatusBadge';
import { SeverityBadge } from '../../components/SeverityBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import dynamic from 'next/dynamic';
import {
  Camera,
  Upload,
  Cpu,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  HelpCircle,
  Copy,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

const DynamicMap = dynamic(() => import('../../components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
      Loading interactive map...
    </div>
  ),
});

export default function ReportPage() {
  const router = useRouter();
  const { isAuthenticated, user, quickLogin } = useAuth();

  // Wizard Step (1 to 5, and 6 for Confirmation)
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);

  // Editable fields (seeded by AI draft, editable by user)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('POTHOLE');
  const [severity, setSeverity] = useState('MEDIUM');
  const [landmark, setLandmark] = useState('');
  const [address, setAddress] = useState('');

  // Location
  const [coordinates, setCoordinates] = useState<[number, number]>([40.7128, -74.006]);
  const [isLocating, setIsLocating] = useState(false);

  // Duplicates
  const [duplicateCandidates, setDuplicateCandidates] = useState<any[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      setErrorMsg('Invalid file format. Please upload JPG, PNG, or WebP.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds 10MB limit.');
      return;
    }

    setErrorMsg(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // Step 2: Trigger AI Analysis
  const runAiAnalysis = async () => {
    if (!imageFile) return;
    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const res = await api.ai.analyzeImage(formData);
      if (res?.data) {
        const d = res.data;
        setAiResult(d);
        setCategory(d.category.toUpperCase());
        setSeverity(d.severity.toUpperCase());
        setDescription(d.description || '');
        setTitle(`${formatCategory(d.category)} Problem`);
        setCurrentStep(2);
      }
    } catch (err: any) {
      console.warn('AI analysis failed:', err.message);
      // Fallback defaults so user can still proceed
      setCategory('POTHOLE');
      setSeverity('MEDIUM');
      setTitle('Civic Infrastructure Issue');
      setDescription('Civic problem observed at location.');
      setCurrentStep(2);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 3: Geolocation
  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordinates([pos.coords.latitude, pos.coords.longitude]);
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation denied or unavailable:', err.message);
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Step 5: Duplicate check before final review
  const runDuplicateCheck = async () => {
    setIsCheckingDuplicates(true);
    try {
      const res = await api.ai.checkDuplicates({
        latitude: coordinates[0],
        longitude: coordinates[1],
        category,
        title,
        description,
      });
      if (res?.data) {
        setDuplicateCandidates(res.data);
      }
    } catch {
      setDuplicateCandidates([]);
    } finally {
      setIsCheckingDuplicates(false);
      setCurrentStep(5);
    }
  };

  // Final Submit
  const handleSubmitReport = async () => {
    if (!isAuthenticated) {
      // Auto login as demo citizen if not authenticated so testing is effortless
      await quickLogin('citizen');
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('severity', severity);
      formData.append('latitude', String(coordinates[0]));
      formData.append('longitude', String(coordinates[1]));
      formData.append('address', address);
      formData.append('landmark', landmark);
      if (imageFile) {
        formData.append('images', imageFile);
      }
      if (aiResult) {
        formData.append('aiAnalysis', JSON.stringify(aiResult));
      }

      const res = await api.reports.create(formData);
      if (res?.data) {
        setSubmittedTicket(res.data);
        setCurrentStep(6); // Confirmation screen
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 w-full">
      {/* Wizard Header Progress Bar */}
      {currentStep <= 5 && (
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Step {currentStep} of 5</span>
            <span>
              {currentStep === 1 && 'Upload Photo'}
              {currentStep === 2 && 'AI Assessment'}
              {currentStep === 3 && 'Incident Location'}
              {currentStep === 4 && 'Details & Confirmation'}
              {currentStep === 5 && 'Review & Duplicate Check'}
            </span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 1: UPLOAD PHOTO */}
      {currentStep === 1 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Upload Issue Photograph</h2>
            <p className="text-slate-600 text-xs max-w-md mx-auto">
              Clear photos of the problem enable our AI to identify the category, assess damage severity, and route to the correct team.
            </p>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 flex flex-col items-center justify-center min-h-[220px]"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
            {imagePreview ? (
              <div className="space-y-4">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-60 rounded-xl object-contain mx-auto shadow-md"
                />
                <p className="text-xs text-blue-600 font-medium">Click to choose a different photo</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Click to upload or take a photo</p>
                  <p className="text-xs text-slate-500">Supports JPG, PNG, and WebP (up to 10MB)</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              disabled={!imageFile || isAnalyzing}
              onClick={runAiAnalysis}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing with AI...</span>
                </>
              ) : (
                <>
                  <span>Analyze Photo with AI</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: AI ANALYSIS REVIEW & USER CORRECTION */}
      {currentStep === 2 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-blue-700 font-semibold text-xs mb-1">
                <Sparkles className="w-4 h-4" />
                <span>AI Vision Assessment Result</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">Review AI Diagnosis</h2>
            </div>
            {aiResult && (
              <span className="text-xs bg-blue-50 text-blue-700 font-mono px-2.5 py-1 rounded-full border border-blue-200">
                Confidence {Math.round((aiResult.confidence || 0.85) * 100)}%
              </span>
            )}
          </div>

          {/* AI Disclosure Banner */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">AI Recommendation Notice: </span>
              AI suggestions are drafts, not verified facts. You may correct the category or severity below before submitting.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {imagePreview && (
              <div className="rounded-xl overflow-hidden border border-slate-200 h-64 bg-slate-100 flex items-center justify-center">
                <img src={imagePreview} alt="Damage" className="h-full w-full object-cover" />
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Detected Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="POTHOLE">Pothole / Road Damage</option>
                  <option value="BROKEN_STREETLIGHT">Broken Streetlight</option>
                  <option value="GARBAGE_ACCUMULATION">Garbage Accumulation</option>
                  <option value="WATER_LEAKAGE">Water Leakage</option>
                  <option value="BLOCKED_DRAINAGE">Blocked Drainage</option>
                  <option value="DAMAGED_SIDEWALK">Damaged Sidewalk</option>
                  <option value="FALLEN_TREE">Fallen Tree / Branch</option>
                  <option value="EXPOSED_WIRING">Exposed Electrical Wiring</option>
                  <option value="DAMAGED_INFRASTRUCTURE">Damaged Public Structure</option>
                  <option value="OTHER">Other Municipal Problem</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Severity Assessment
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      className={`text-xs py-2 rounded-lg font-semibold border transition-all ${
                        severity === sev
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {aiResult && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">
                    AI Recommended Action
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {aiResult.recommended_action}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-medium flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-sm"
            >
              <span>Confirm & Set Location</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: LOCATION PINNING */}
      {currentStep === 3 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Specify Incident Location</h2>
              <p className="text-slate-600 text-xs">
                Drag the marker or click on the map to set the precise location.
              </p>
            </div>
            <button
              type="button"
              onClick={requestCurrentLocation}
              disabled={isLocating}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-blue-200 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{isLocating ? 'Locating...' : 'Use My GPS'}</span>
            </button>
          </div>

          <div className="h-80 w-full rounded-xl overflow-hidden border border-slate-200">
            <DynamicMap
              center={coordinates}
              selectedLocation={coordinates}
              interactiveSelection={true}
              onLocationSelect={(lat, lng) => setCoordinates([lat, lng])}
              zoom={14}
              className="h-full w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Street Address (Optional)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 150 Broadway or Corner of 5th Ave"
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nearby Landmark (Optional)
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. In front of Elementary School"
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Selected Coordinates: {coordinates[0].toFixed(5)}, {coordinates[1].toFixed(5)}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-medium flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-sm"
            >
              <span>Next: Additional Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: ADDITIONAL DETAILS */}
      {currentStep === 4 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Provide Additional Context</h2>
            <p className="text-slate-600 text-xs">
              Give municipal responders specific details that will help them resolve the problem quickly.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Issue Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief summary of the issue"
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Detailed Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe visible damage, hazard context, or impact on traffic/pedestrians"
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 leading-relaxed"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-medium flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              disabled={!title.trim() || !description.trim() || isCheckingDuplicates}
              onClick={runDuplicateCheck}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-sm"
            >
              {isCheckingDuplicates ? 'Scanning Duplicates...' : 'Review & Submit'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: REVIEW & DUPLICATE CHECK */}
      {currentStep === 5 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Review & Submit Report</h2>
            <p className="text-slate-600 text-xs">
              Confirm your report details before dispatching to municipal teams.
            </p>
          </div>

          {/* Duplicate Detection Alert */}
          {duplicateCandidates.length > 0 && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>
                  Potential Similar Reports Detected Nearby ({duplicateCandidates.length})
                </span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Another citizen has reported an issue close to your location. You can view existing tickets or continue with a distinct report.
              </p>
              <div className="space-y-2">
                {duplicateCandidates.slice(0, 2).map((dup) => (
                  <div
                    key={dup.reportId}
                    className="p-3 bg-white rounded-lg border border-amber-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-semibold text-slate-800">
                        {dup.ticketNumber}
                      </span>
                      <p className="font-medium text-slate-900">{dup.title}</p>
                      <span className="text-[11px] text-slate-500">
                        {dup.distanceMeters}m away • {dup.matchReason}
                      </span>
                    </div>
                    <StatusBadge status={dup.status} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ticket Summary Card */}
          <div className="border border-slate-200 rounded-xl p-5 space-y-4 bg-slate-50/50">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-blue-600 uppercase">
                  {formatCategory(category)}
                </span>
                <h3 className="font-bold text-slate-900 text-base">{title}</h3>
              </div>
              <SeverityBadge severity={severity} />
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">{description}</p>

            <div className="text-xs text-slate-500 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {address || `${coordinates[0].toFixed(4)}, ${coordinates[1].toFixed(4)}`}
                {landmark && ` (${landmark})`}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(4)}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-medium flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              disabled={isSubmitting}
              onClick={handleSubmitReport}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting Ticket...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Submit Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: CONFIRMATION & TICKET RECEIPT */}
      {currentStep === 6 && submittedTicket && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Report Successfully Submitted!</h2>
            <p className="text-slate-600 text-xs max-w-md mx-auto">
              Your civic issue has been logged into the municipal queue and assigned a tracking ticket.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 max-w-sm mx-auto space-y-3">
            <div className="text-xs text-slate-500 font-semibold uppercase">Tracking Reference</div>
            <div className="text-2xl font-mono font-extrabold text-blue-600 tracking-wider">
              {submittedTicket.ticketNumber}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(submittedTicket.ticketNumber);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied to clipboard!' : 'Copy Reference Number'}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={() => router.push('/my-reports')}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-sm"
            >
              Track in My Reports
            </button>
            <button
              onClick={() => {
                // Reset form to submit another
                setImageFile(null);
                setImagePreview(null);
                setAiResult(null);
                setTitle('');
                setDescription('');
                setCurrentStep(1);
              }}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm"
            >
              Submit Another Issue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
