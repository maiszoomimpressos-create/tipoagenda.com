import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Link } from 'react-router-dom';

const SignupForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);

  const formatPhoneNumberInput = (value: string) => {
    if (!value) return '';
    let cleaned = value.replace(/\D/g, ''); // Remove non-digits
    if (cleaned.length > 11) cleaned = cleaned.substring(0, 11); // Limit to 11 digits

    if (cleaned.length <= 2) {
      return `(${cleaned}`;
    } else if (cleaned.length <= 7) { // (XX) XXXXX
      return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2)}`;
    } else if (cleaned.length <= 11) { // (XX) XXXXX-XXXX
      return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
    }
    return cleaned;
  };

  const formatCpfInput = (value: string) => {
    if (!value) return '';
    let cleaned = value.replace(/\D/g, ''); // Remove non-digits
    if (cleaned.length > 11) cleaned = cleaned.substring(0, 11); // Limit to 11 digits

    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `${cleaned.substring(0, 3)}.${cleaned.substring(3)}`;
    } else if (cleaned.length <= 9) {
      return `${cleaned.substring(0, 3)}.${cleaned.substring(3, 6)}.${cleaned.substring(6)}`;
    } else {
      return `${cleaned.substring(0, 3)}.${cleaned.substring(3, 6)}.${cleaned.substring(6, 9)}-${cleaned.substring(9)}`;
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhoneNumberInput(e.target.value);
    setPhoneNumber(formattedValue);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCpfInput(e.target.value);
    setCpf(formattedValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber.replace(/\D/g, ''), // Store only digits
          cpf: cpf.replace(/\D/g, ''), // Store only digits
        },
      },
    });
    if (error) {
      showError(error.message);
    } else {
      showSuccess('Verifique seu e-mail para confirmar o cadastro!');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first-name">Nome</Label>
          <Input
            id="first-name"
            type="text"
            placeholder="Seu nome"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="last-name">Sobrenome</Label>
          <Input
            id="last-name"
            type="text"
            placeholder="Seu sobrenome"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="phone-number">Número de Telefone</Label>
        <Input
          id="phone-number"
          type="tel"
          placeholder="(XX) XXXXX-XXXX"
          value={phoneNumber}
          onChange={handlePhoneNumberChange}
          maxLength={15}
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="cpf">CPF</Label>
        <Input
          id="cpf"
          type="text"
          placeholder="XXX.XXX.XXX-XX"
          value={cpf}
          onChange={handleCpfChange}
          maxLength={14}
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="password">Crie uma senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="confirm-password">Confirme a senha</Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="mt-1"
        />
      </div>
      <Button
        type="submit"
        className="w-full !rounded-button whitespace-nowrap bg-yellow-600 hover:bg-yellow-700 text-black"
        disabled={loading}
      >
        {loading ? 'Cadastrando...' : 'Cadastrar'}
      </Button>
      <div className="text-center text-sm mt-4">
        Já tem uma conta?{' '}
        <Link to="/login" className="text-yellow-600 hover:underline">
          Entrar
        </Link>
      </div>
    </form>
  );
};

export default SignupForm;