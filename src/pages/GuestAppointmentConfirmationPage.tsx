import { useParams, Link } from "react-router-dom";

const GuestAppointmentConfirmationPage = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-4 text-gray-900">
          Agendamento Confirmado!
        </h1>
        <p className="text-gray-700 mb-2">
          Seu agendamento como convidado foi registrado com sucesso.
        </p>
        {appointmentId && (
          <p className="text-sm text-gray-500 mb-4">
            Código do agendamento: <span className="font-mono">{appointmentId}</span>
          </p>
        )}
        <p className="text-gray-600 mb-6">
          Caso precise alterar ou cancelar, entre em contato com o estabelecimento.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-black font-medium rounded-full transition-colors"
        >
          Voltar para a página inicial
        </Link>
      </div>
    </div>
  );
};

export default GuestAppointmentConfirmationPage;


