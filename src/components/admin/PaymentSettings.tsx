import React, { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle } from 'lucide-react';
import { PaymentSettings } from '../../types';
import { getPaymentSettings, updatePaymentSettings } from '../../services/supabaseService';
import { useAuth } from '../../context/AuthContext';

export const PaymentSettingsAdmin: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getPaymentSettings().then(s => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!settings || !user) return;
    setSaving(true);
    try {
      await updatePaymentSettings(settings, user.email || 'unknown');
      setMessage('Payment settings saved successfully.');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      alert('Error saving settings: ' + err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader2 className="w-8 h-8 animate-spin text-purple-500" />;
  if (!settings) return null;

  return (
    <div className="p-6 space-y-6 bg-[#1A1926] rounded-2xl border border-white/10">
      <h2 className="text-xl font-black text-white">Payment Settings</h2>
      
      {/* Nigerian */}
      <div className="space-y-3 p-4 bg-black/40 rounded-xl border border-white/5">
        <h3 className="font-bold text-white">Nigerian (OPay)</h3>
        <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.nigerianMethod.enabled} onChange={e => setSettings({...settings, nigerianMethod: {...settings.nigerianMethod, enabled: e.target.checked}})} />
            Enabled
        </label>
        <input type="text" value={settings.nigerianMethod.name} placeholder="Method Name" className="w-full p-2 bg-black rounded" onChange={e => setSettings({...settings, nigerianMethod: {...settings.nigerianMethod, name: e.target.value}})} />
        <input type="text" value={settings.nigerianMethod.accountName} placeholder="Account Name" className="w-full p-2 bg-black rounded" onChange={e => setSettings({...settings, nigerianMethod: {...settings.nigerianMethod, accountName: e.target.value}})} />
        <input type="text" value={settings.nigerianMethod.accountNumber} placeholder="Account Number" className="w-full p-2 bg-black rounded" onChange={e => setSettings({...settings, nigerianMethod: {...settings.nigerianMethod, accountNumber: e.target.value}})} />
      </div>

      {/* International */}
      <div className="space-y-3 p-4 bg-black/40 rounded-xl border border-white/5">
        <h3 className="font-bold text-white">International (TapTap Send)</h3>
        <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.internationalMethod.enabled} onChange={e => setSettings({...settings, internationalMethod: {...settings.internationalMethod, enabled: e.target.checked}})} />
            Enabled
        </label>
        <input type="text" value={settings.internationalMethod.recipientName} placeholder="Recipient Name" className="w-full p-2 bg-black rounded" onChange={e => setSettings({...settings, internationalMethod: {...settings.internationalMethod, recipientName: e.target.value}})} />
        <input type="text" value={settings.internationalMethod.accountNumber} placeholder="Account Number" className="w-full p-2 bg-black rounded" onChange={e => setSettings({...settings, internationalMethod: {...settings.internationalMethod, accountNumber: e.target.value}})} />
      </div>
      
      <input type="text" value={settings.whatsappSupportLink} placeholder="WhatsApp Support Link" className="w-full p-2 bg-black rounded" onChange={e => setSettings({...settings, whatsappSupportLink: e.target.value})} />

      <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-purple-600 py-3 px-6 rounded-xl font-bold">
        {saving ? <Loader2 className="animate-spin" /> : <Save />} Save Changes
      </button>

      {message && <p className="text-emerald-400 font-bold flex items-center gap-2"><CheckCircle /> {message}</p>}
    </div>
  );
};
