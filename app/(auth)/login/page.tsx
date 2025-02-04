'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';

import { login, type LoginActionState } from '../actions';
import Image from 'next/image';

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    {
      status: 'idle',
    },
  );

  useEffect(() => {
    if (state.status === 'failed') {
      toast.error('Invalid credentials!');
    } else if (state.status === 'invalid_data') {
      toast.error('Failed validating your submission!');
    } else if (state.status === 'success') {
      setIsSuccessful(true);
      router.refresh();
    }
  }, [state.status, router]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get('email') as string);
    formAction(formData);
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2">
      <div className="p-8 lg:p-12 bg-[#F8F9FF]">
        <div className="max-w-[520px] mx-auto">
          <div className="flex items-center gap-2 mb-16">
            <Image src={`/images/thoughtworks_flamingo_wave.png`} width={144} height={79} alt="" />
          </div>

          <Image
            src={`/images/ai_illustration.jpg`}
            alt="Workflow Illustration"
            width={500}
            height={300}
            className="mb-8"
          />

          <h1 className="text-3xl font-bold mb-4">Data Conversations, Redefined</h1>
          <p className="text-gray-600 leading-relaxed">
            Supercharge decisions with our AI Assistant by making your structured and unstructured data work for you. Our AI knows how to listen, learn, and deliver answers.
          </p>
        </div>
      </div>
      <div className="p-8 lg:p-12 flex items-center justify-center">
        <div className="w-full max-w-[440px]">
          <AuthForm action={handleSubmit} defaultEmail={email} title="Sign In">
            <SubmitButton isSuccessful={isSuccessful}>Sign in</SubmitButton>
            <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
              {"Don't have an account? "}
              <Link
                href="/register"
                className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              >
                Sign up
              </Link>
              {' for free.'}
            </p>
          </AuthForm>
        </div>
      </div>
    </div>
  );
}
