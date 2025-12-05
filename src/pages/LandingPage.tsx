import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const LandingPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');

  const categories = [
    { id: 'todos', name: 'Todos os Serviços', icon: 'fas fa-th-large' },
    { id: 'beleza', name: 'Beleza & Estética', icon: 'fas fa-spa' },
    { id: 'saude', name: 'Saúde & Bem-estar', icon: 'fas fa-heartbeat' },
    { id: 'fitness', name: 'Fitness & Personal', icon: 'fas fa-dumbbell' },
    { id: 'educacao', name: 'Educação & Coaching', icon: 'fas fa-graduation-cap' },
    { id: 'negocios', name: 'Consultoria & Negócios', icon: 'fas fa-briefcase' },
    { id: 'casa', name: 'Casa & Manutenção', icon: 'fas fa-home' },
    { id: 'auto', name: 'Automotivo', icon: 'fas fa-car' },
    { id: 'pet', name: 'Pet Care', icon: 'fas fa-paw' }
  ];

  const services = [
    { name: 'Barbearia Premium', category: 'beleza', rating: 4.9, price: 'A partir de R$ 35' },
    { name: 'Salão de Beleza', category: 'beleza', rating: 4.8, price: 'A partir de R$ 45' },
    { name: 'Nutricionista', category: 'saude', rating: 4.7, price: 'A partir de R$ 80' },
    { name: 'Personal Trainer', category: 'fitness', rating: 4.9, price: 'A partir de R$ 60' },
    { name: 'Psicólogo Online', category: 'saude', rating: 4.8, price: 'A partir de R$ 120' },
    { name: 'Coach de Carreira', category: 'educacao', rating: 4.6, price: 'A partir de R$ 150' },
    { name: 'Consultoria Financeira', category: 'negocios', rating: 4.8, price: 'A partir de R$ 200' },
    { name: 'Eletricista', category: 'casa', rating: 4.7, price: 'A partir de R$ 80' },
    { name: 'Mecânico Automotivo', category: 'auto', rating: 4.8, price: 'A partir de R$ 100' },
    { name: 'Veterinário', category: 'pet', rating: 4.9, price: 'A partir de R$ 90' },
    { name: 'Manicure & Pedicure', category: 'beleza', rating: 4.7, price: 'A partir de R$ 25' },
    { name: 'Massoterapia', category: 'saude', rating: 4.8, price: 'A partir de R$ 70' }
  ];

  const filteredServices = services.filter(service => {
    const matchesCategory = selectedCategory === 'todos' || service.category === selectedCategory;
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section 
        className="relative min-h-screen flex items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(26, 26, 26, 0.8), rgba(45, 45, 45, 0.6)), url('https://readdy.ai/api/search-image?query=modern%20professional%20services%20appointment%20booking%20platform%20with%20diverse%20people%20using%20smartphones%20and%20tablets%20in%20clean%20minimalist%20environment%20with%20soft%20lighting%20and%20contemporary%20design%20elements&width=1440&height=1024&seq=hero-landing&orientation=landscape')`
        }}
      >
        <div className="container mx-auto px-6 text-center text-white">
          <h1 className="text-6xl font-bold mb-6 leading-tight">
            Agende Seus <span className="text-yellow-400">Serviços Favoritos</span><br />
            Em Um Só Lugar
          </h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto text-gray-200">
            Conectamos você aos melhores profissionais da sua região. Beleza, saúde, fitness, consultoria e muito mais. 
            Reserve seu horário em segundos e tenha uma experiência excepcional.
          </p>

          {/* Search Bar */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-white rounded-2xl p-6 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  <Input
                    type="text"
                    placeholder="Que serviço você procura?"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-14 text-lg border-gray-200 text-gray-800"
                  />
                </div>
                <div className="relative">
                  <i className="fas fa-map-marker-alt absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  <Input
                    type="text"
                    placeholder="Sua localização"
                    className="pl-12 h-14 text-lg border-gray-200 text-gray-800"
                  />
                </div>
                <Button className="!rounded-button whitespace-nowrap h-14 text-lg font-semibold bg-yellow-600 hover:bg-yellow-700 text-black">
                  <i className="fas fa-search mr-2"></i>
                  Buscar Serviços
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-400 mb-2">15.000+</div>
              <div className="text-gray-200">Profissionais</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-400 mb-2">50.000+</div>
              <div className="text-gray-200">Agendamentos</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-400 mb-2">4.9</div>
              <div className="text-gray-200">Avaliação Média</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-400 mb-2">95%</div>
              <div className="text-gray-200">Satisfação</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Explore Por Categoria</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Encontre exatamente o que precisa navegando pelas nossas categorias especializadas
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
            {categories.slice(1).map((category) => (
              <Card
                key={category.id}
                className={`border-2 cursor-pointer transition-all hover:shadow-lg ${
                  selectedCategory === category.id
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-gray-200 hover:border-yellow-200'
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    selectedCategory === category.id
                      ? 'bg-yellow-400 text-black'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <i className={`${category.icon} text-2xl`}></i>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">{category.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredServices.map((service, index) => (
              <Card key={index} className="border-gray-200 cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="relative mb-4">
                    <img
                      src={`https://readdy.ai/api/search-image?query=professional%20${service.name.toLowerCase()}%20service%20provider%20in%20modern%20clean%20workspace%20with%20professional%20tools%20and%20equipment&width=300&height=200&seq=${service.name.replace(/\s+/g, '-').toLowerCase()}&orientation=landscape`}
                      alt={service.name}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded-lg shadow">
                      <div className="flex items-center gap-1">
                        <i className="fas fa-star text-yellow-500 text-sm"></i>
                        <span className="text-sm font-semibold">{service.rating}</span>
                      </div>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{service.name}</h3>
                  <p className="text-yellow-600 font-semibold mb-4">{service.price}</p>
                  <Button className="!rounded-button whitespace-nowrap w-full bg-yellow-600 hover:bg-yellow-700 text-black">
                    <i className="fas fa-calendar-alt mr-2"></i>
                    Agendar Agora
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Como Funciona</h2>
            <p className="text-xl text-gray-600">Agendar nunca foi tão simples e rápido</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                step: '1',
                title: 'Busque e Compare',
                description: 'Encontre profissionais qualificados na sua região e compare preços e avaliações',
                icon: 'fas fa-search'
              },
              {
                step: '2',
                title: 'Escolha o Horário',
                description: 'Selecione o dia e horário que funciona melhor para você em tempo real',
                icon: 'fas fa-calendar-check'
              },
              {
                step: '3',
                title: 'Confirme e Relaxe',
                description: 'Receba confirmação instantânea e lembretes automáticos do seu agendamento',
                icon: 'fas fa-check-circle'
              }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className={`${item.icon} text-2xl text-black`}></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  <span className="text-yellow-600">#{item.step}</span> {item.title}
                </h3>
                <p className="text-gray-600 text-lg">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Pronto Para Começar?
          </h2>
          <p className="text-xl mb-8 text-gray-300 max-w-2xl mx-auto">
            Junte-se a milhares de usuários que já descobriram a forma mais fácil de agendar serviços
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="!rounded-button whitespace-nowrap text-lg px-8 py-4 bg-yellow-600 hover:bg-yellow-700 text-black">
              <i className="fas fa-user-plus mr-2"></i>
              Cadastrar-se Grátis
            </Button>
            <Button variant="outline" className="!rounded-button whitespace-nowrap text-lg px-8 py-4 border-white text-white hover:bg-white hover:text-gray-900">
              <i className="fas fa-store mr-2"></i>
              Sou Profissional
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;