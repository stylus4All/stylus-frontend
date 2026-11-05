
import React, { useState } from 'react';
import { Button } from './Button';
import { Upload, Check } from 'lucide-react';
import CustomSelect from './CustomSelect';

interface UserVerificationFormProps {
    onSubmit: (data: any) => void;
}

export const UserVerificationForm: React.FC<UserVerificationFormProps> = ({ onSubmit }) => {
    const [bvn, setBvn] = useState('');
    const [idType, setIdType] = useState('NIN');
    const [idFile, setIdFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setIdFile(e.target.files[0]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!idFile) return;
        const govIdUrl = URL.createObjectURL(idFile);
        onSubmit({ bvn, idType, govIdUrl });
    };

    return (
        <div className="bg-[#1f0c05] p-8 border border-golden-orange shadow-2xl rounded-sm">
            <h3 className="font-serif text-2xl text-cream mb-4">Identity Verification</h3>
            <p className="text-sm text-cream/60 mb-6">Mild verification to confirm your identity for rentals.</p>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-4 mb-6">
                    <div>
                        <label className="text-xs uppercase text-cream/50 mb-1 block">BVN (11 Digits)</label>
                        <input required placeholder="Enter BVN" value={bvn} onChange={e => setBvn(e.target.value)} className="w-full bg-black/20 border border-white/10 text-cream p-3 focus:border-golden-orange outline-none" />
                    </div>

                    <div>
                        <label className="text-xs uppercase text-cream/50 mb-1 block">Identification Type</label>
                        <div className="relative mb-2">
                            <CustomSelect
                                options={['National Identity Number (NIN)', "Driver's License", 'International Passport', "Voter's Card"]}
                                value={idType}
                                onChange={(v) => setIdType(v)}
                                placeholder="Select ID type"
                            />
                        </div>
                    </div>

                    <div className="border-2 border-dashed border-white/10 p-6 text-center cursor-pointer hover:border-golden-orange/50 transition-colors bg-white/5 relative">
                        <input type="file" required onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" />
                        <Upload className="mx-auto text-cream/40 mb-2" />
                        <span className="text-xs uppercase text-cream/60 flex items-center justify-center gap-2">
                            {idFile ? <><Check size={14} className="text-green-400" /> {idFile.name}</> : `Upload ${idType} Document`}
                        </span>
                    </div>
                </div>
                <Button fullWidth>Submit for Verification</Button>
            </form>
        </div>
    );
};
