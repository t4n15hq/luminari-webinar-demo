import React from 'react';
import { FileText, Clipboard, Stethoscope, Sparkles, ArrowRight } from 'lucide-react';

const DashboardHeader = () => {
  const featureCards = [
    {
      title: "Protocol & Study Design Generator",
      subtext: "Generate comprehensive clinical protocols for various diseases and conditions",
      icon: FileText,
      background: "bg-amber-50",
      borderColor: "border-amber-100",
      hoverBackground: "hover:bg-amber-100"
    },
    {
      title: "Regulatory Document Generator", 
      subtext: "Create regulatory documents for pharmaceutical development across global markets",
      icon: Clipboard,
      background: "bg-purple-50",
      borderColor: "border-purple-100",
      hoverBackground: "hover:bg-purple-100"
    },
    {
      title: "Disease Screening",
      subtext: "AI-powered tools for diagnosing conditions across multiple medical specialties", 
      icon: Stethoscope,
      background: "bg-gray-50",
      borderColor: "border-gray-100",
      hoverBackground: "hover:bg-gray-100"
    },
    {
      title: "Ask Lumina™",
      subtext: "get expert answers to complex questions about clinical trials, and protocols",
      icon: Sparkles,
      background: "bg-gray-50", 
      borderColor: "border-gray-100",
      hoverBackground: "hover:bg-gray-100"
    }
  ];

  return (
    <div className="min-h-screen bg-white font-inter">
      {/* Purple Gradient Header Bar */}
      <div className="bg-gradient-to-r from-purple-800 to-purple-600 px-6 py-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="text-white text-xl font-semibold">
            LumiPath
          </div>
          <div className="text-white text-xl font-semibold tracking-wider">
            LUMINARI
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Large Centered Heading */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
            Luminari <span className="text-sm align-top">®™</span> LumiPath<span className="text-sm align-top">™</span>
          </h1>
          <h2 className="text-2xl md:text-3xl text-gray-700 font-medium">
            UX Intro Header Here?
          </h2>
        </div>

        {/* 4-Column Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {featureCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <div
                key={index}
                className={`${card.background} ${card.borderColor} ${card.hoverBackground} 
                  border rounded-xl p-6 cursor-pointer transition-all duration-300 ease-in-out 
                  hover:shadow-lg hover:scale-105 group relative overflow-hidden`}
              >
                {/* Icon */}
                <div className="mb-4">
                  <IconComponent className="w-8 h-8 text-gray-700" />
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-gray-900 mb-3 leading-tight">
                  {card.title}
                </h3>

                {/* Subtext */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {card.subtext}
                </p>

                {/* Arrow Icon - Bottom Right */}
                <div className="absolute bottom-4 right-4">
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors duration-300" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Gray Descriptive Text Area */}
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600 text-base leading-relaxed max-w-4xl mx-auto">
            Any need for descriptive text in this area for technical assistance, suggested prompts, 
            functionality awareness or expansion, next steps preparation, customization tips, 
            protocols for enablement, and so on...
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;