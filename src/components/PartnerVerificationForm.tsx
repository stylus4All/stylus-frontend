
import React, { useState } from 'react';
import { Button } from './Button';
import { FileText, Upload, Building2, Check, User, CreditCard } from 'lucide-react';
import CustomSelect from './CustomSelect';

interface PartnerVerificationFormProps {
    onSubmit: (data: any) => void;
}

export const PartnerVerificationForm: React.FC<PartnerVerificationFormProps> = ({ onSubmit }) => {
    const [cac, setCac] = useState('');
    const [bizName, setBizName] = useState('');
    const [bvn, setBvn] = useState('');
    const [idType, setIdType] = useState('NIN');
    const [certFile, setCertFile] = useState<File | null>(null);
    const [idFile, setIdFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File | null>>) => {
        if (e.target.files && e.target.files[0]) setter(e.target.files[0]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!certFile || !idFile) return;
        const cacCertUrl = URL.createObjectURL(certFile);
        const govIdUrl = URL.createObjectURL(idFile);

        onSubmit({
            cacNumber: cac,
            businessName: bizName,
            bvn,
            idType,
            cacCertUrl,
            govIdUrl
        });
    };

    return (
        <div className="bg-[#1f0c05] p-8 border border-golden-orange shadow-2xl rounded-sm max-h-[80vh] overflow-y-auto custom-scrollbar">
            <h3 className="font-serif text-2xl text-cream mb-2">Partner Registration</h3>
            <p className="text-sm text-cream/60 mb-6 border-b border-white/10 pb-4">
                Strict verification required to list inventory. Please provide Business & Director details.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Section 1: Business Details */}
                <div>
                    <h4 className="text-golden-orange text-xs uppercase font-bold mb-3 flex items-center gap-2">
                        <Building2 size={14} /> Business Details
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="text-[10px] uppercase text-cream/50 mb-1 block">Registered Business Name</label>
                            <input required placeholder="Luxe Rentals Ltd" value={bizName} onChange={e => setBizName(e.target.value)} className="w-full bg-black/20 border border-white/10 text-cream p-3 focus:border-golden-orange outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase text-cream/50 mb-1 block">CAC Registration Number</label>
                            <input required placeholder="RC-000000" value={cac} onChange={e => setCac(e.target.value)} className="w-full bg-black/20 border border-white/10 text-cream p-3 focus:border-golden-orange outline-none" />
                        </div>

                        <div className="border-2 border-dashed border-white/10 p-4 text-center cursor-pointer hover:border-golden-orange/50 transition-colors bg-white/5 relative">
                            <input type="file" required onChange={(e) => handleFileChange(e, setCertFile)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*,application/pdf" />
                            <FileText className="mx-auto text-cream/40 mb-2" />
                            <span className="text-[10px] uppercase text-cream/60 flex items-center justify-center gap-1">
                                {certFile ? <><Check size={10} className="text-green-400" /> {certFile.name}</> : "Upload CAC Certificate"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Section 2: Director/Partner Identity */}
                <div>
                    <h4 className="text-golden-orange text-xs uppercase font-bold mb-3 flex items-center gap-2">
                        <User size={14} /> Director / Partner Identity
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="text-[10px] uppercase text-cream/50 mb-1 block">Director's BVN (11 Digits)</label>
                            <input required placeholder="Enter BVN" value={bvn} onChange={e => setBvn(e.target.value)} className="w-full bg-black/20 border border-white/10 text-cream p-3 focus:border-golden-orange outline-none" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase text-cream/50 mb-1 block">ID Type</label>
                                <div className="relative">
                                    <CustomSelect
                                        options={['NIN (National ID)', "Int'l Passport", "Driver's License", "Voter's Card"]}
                                        value={idType}
                                        onChange={(v) => setIdType(v)}
                                        placeholder="Select ID type"
                                    />
                                </div>
                            </div>

                            <div className="border-2 border-dashed border-white/10 p-3 text-center cursor-pointer hover:border-golden-orange/50 transition-colors bg-white/5 relative flex flex-col justify-center">
                                <input type="file" required onChange={(e) => handleFileChange(e, setIdFile)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" />
                                <Upload className="mx-auto text-cream/40 mb-1" size={16} />
                                <span className="text-[10px] uppercase text-cream/60 flex items-center justify-center gap-1 leading-tight">
                                    {idFile ? <><Check size={10} className="text-green-400" /> Uploaded</> : "Upload ID"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Payment */}
                <div className="bg-golden-orange/10 p-5 border border-golden-orange/30 text-center rounded-sm">
                    <p className="text-xs uppercase text-golden-orange font-bold mb-2 flex items-center justify-center gap-2">
                        <CreditCard size={14} /> One-Time Partnership Fee
                    </p>
                    <div className="flex justify-center items-baseline gap-2">
                        <p className="text-3xl font-serif text-cream">₦20,000</p>
                        <span className="text-sm text-cream/50">or</span>
                        <p className="text-3xl font-serif text-cream">$15</p>
                    </div>
                    <p className="text-[10px] text-cream/50 mt-2">
                        Secure payment required to process verification and unlock seller dashboard.
                    </p>
                </div>

                <Button fullWidth>Pay Fee & Submit Application</Button>
            </form>
        </div>
    );
};
