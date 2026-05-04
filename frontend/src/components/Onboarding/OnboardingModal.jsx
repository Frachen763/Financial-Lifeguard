import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, User, MapPin, DollarSign, Briefcase } from 'lucide-react';
import { onboardingAPI } from '../../utils/api';

const OnboardingModal = ({ isOpen, onComplete, onClose }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    occupation: '',
    country: '',
    state: '',
    city: '',
    monthlyIncome: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef([]);

  const totalSteps = 5;

  // Professional country and state data
  const countries = [
    'India', 'United States', 'United Kingdom', 'Canada', 'Australia',
    'Germany', 'France', 'Japan', 'Singapore', 'United Arab Emirates',
    'China', 'Brazil', 'Mexico', 'Italy', 'Spain', 'Netherlands',
    'South Korea', 'Switzerland', 'Sweden', 'Norway', 'Denmark',
    'New Zealand', 'Hong Kong', 'Malaysia', 'Thailand', 'Indonesia',
    'Philippines', 'Vietnam', 'South Africa', 'Egypt', 'Israel',
    'Turkey', 'Russia', 'Poland', 'Belgium', 'Austria', 'Ireland'
  ];

  const statesByCountry = {
    'India': [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
      'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
      'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
      'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
      'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
      'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi NCR',
      'Jammu & Kashmir', 'Ladakh', 'Andaman & Nicobar Islands', 'Chandigarh', 'Puducherry'
    ],
    'United States': [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
      'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
      'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
      'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
      'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
      'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
      'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
      'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
      'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
      'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'
    ],
    'United Kingdom': [
      'England', 'Scotland', 'Wales', 'Northern Ireland'
    ],
    'Canada': [
      'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
      'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia',
      'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'
    ],
    'Australia': [
      'New South Wales', 'Victoria', 'Queensland', 'Western Australia',
      'South Australia', 'Tasmania', 'Australian Capital Territory', 'Northern Territory'
    ],
    'Germany': [
      'Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen',
      'Hamburg', 'Hesse', 'Lower Saxony', 'Mecklenburg-Vorpommern',
      'North Rhine-Westphalia', 'Rhineland-Palatinate', 'Saarland',
      'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'
    ],
    'France': [
      'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Brittany',
      'Centre-Val de Loire', 'Corsica', 'Grand Est', 'Hauts-de-France',
      'Île-de-France', 'Normandy', 'Nouvelle-Aquitaine', 'Occitanie',
      'Pays de la Loire', 'Provence-Alpes-Côte d\'Azur'
    ],
    'Japan': [
      'Hokkaido', 'Tohoku', 'Kanto', 'Chubu', 'Kansai', 'Chugoku', 'Shikoku', 'Kyushu-Okinawa'
    ],
    'Singapore': [
      'Central Region', 'East Region', 'North Region', 'North-East Region', 'West Region'
    ],
    'United Arab Emirates': [
      'Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'
    ]
  };

  const citiesByState = {
    // India - All 28 States + Union Territories with Major Cities
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati', 'Rajahmundry', 'Kakinada', 'Anantapur', 'Eluru'],
    'Arunachal Pradesh': ['Itanagar', 'Tawang', 'Ziro', 'Pasighat', 'Bomdila', 'Tezu', 'Changlang', 'Daporijo', 'Along', 'Namsai'],
    'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tezpur', 'Bongaigaon', 'Karimganj', 'Sibsagar', 'Dhubri'],
    'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar'],
    'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Durg', 'Korba', 'Rajnandgaon', 'Raigarh', 'Jagdalpur', 'Ambikapur', 'Dhamtari'],
    'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda', 'Bicholim', 'Curchorem', 'Sanquelim', 'Cuncolim', 'Quepem'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Nadiad', 'Anand'],
    'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Karnal', 'Rohtak', 'Hisar', 'Sonipat', 'Yamunanagar', 'Panchkula'],
    'Himachal Pradesh': ['Shimla', 'Manali', 'Dharamshala', 'Solan', 'Mandi', 'Palampur', 'Bilaspur', 'Kullu', 'Chamba', 'Una'],
    'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Phusro', 'Hazaribagh', 'Giridih', 'Ramgarh', 'Medininagar'],
    'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi', 'Gulbarga', 'Davanagere', 'Ballari', 'Bijapur', 'Shivamogga'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad', 'Alappuzha', 'Malappuram', 'Kannur', 'Kasaragod'],
    'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur', 'Amravati', 'Navi Mumbai', 'Kolhapur', 'Sangli'],
    'Manipur': ['Imphal', 'Thoubal', 'Churachandpur', 'Bishnupur', 'Kakching', 'Ukhrul', 'Senapati', 'Tamenglong', 'Noney', 'Jiribam'],
    'Meghalaya': ['Shillong', 'Tura', 'Nongstoin', 'Jowai', 'Baghmara', 'Williamnagar', 'Resubelpara', 'Mawkyrwat', 'Khliehriat', 'Ampati'],
    'Mizoram': ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip', 'Kolasib', 'Lawngtlai', 'Saitual', 'Mamit', 'Saiha', 'Hnahthial'],
    'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha', 'Zunheboto', 'Phek', 'Kiphire', 'Longleng', 'Peren'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda'],
    'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot', 'Moga', 'Firozpur', 'Batala'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Bhilwara', 'Alwar', 'Sikar', 'Udaipurwati'],
    'Sikkim': ['Gangtok', 'Namchi', 'Mangan', 'Gyalshing', 'Rangpo', 'Singtam', 'Namthang', 'Jorethang', 'Ravangla', 'Rhenock'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Erode', 'Tiruppur', 'Vellore', 'Thoothukudi', 'Dindigul'],
    'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Miryalaguda'],
    'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar', 'Pratapgarh', 'Kailashahar', 'Belonia', 'Khowai', 'Teliamura', 'Santirbazar', 'Kumarghat'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Allahabad', 'Bareilly', 'Aligarh', 'Moradabad'],
    'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rishikesh', 'Kashipur', 'Rudrapur', 'Kashipur', 'Pithoragarh', 'Uttarkashi'],
    'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri', 'Asansol', 'Raniganj', 'Bardhaman', 'Malda', 'Kharagpur', 'Shantiniketan'],
    'Delhi NCR': ['New Delhi', 'Gurgaon', 'Noida', 'Faridabad', 'Ghaziabad', 'Greater Noida', 'Faridabad', 'Gurgaon', 'Noida', 'Delhi'],
    'Jammu & Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Sopore', 'Kathua', 'Rajouri', 'Pulwama', 'Udhampur', 'Kupwara'],
    'Ladakh': ['Leh', 'Kargil', 'Padum', 'Nubra', 'Khalsi', 'Diskit', 'Sankoo', 'Zanskar', 'Changthang', 'Sham Valley'],
    'Andaman & Nicobar Islands': ['Port Blair', 'Car Nicobar', 'Great Nicobar', 'Havelock Island', 'Neil Island', 'Long Island', 'Rangat', 'Diglipur', 'Mayabunder', 'Little Andaman'],
    'Chandigarh': ['Chandigarh', 'Sector 17', 'Sector 22', 'Sector 35', 'Sector 43', 'Manimajra', 'Zirakpur', 'Panchkula', 'Mohali', 'Kharar'],
    'Puducherry': ['Puducherry', 'Karaikal', 'Mahe', 'Yanam', 'Auroville', 'Ousteri', 'Bahour', 'Villianur', 'Mannadipet', 'Nettapakkam'],
    
    // United States - Major Cities
    'California': ['Los Angeles', 'San Diego', 'San Jose', 'San Francisco', 'Fresno', 'Sacramento'],
    'Texas': ['Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth', 'El Paso'],
    'New York': ['New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse', 'Albany'],
    'Florida': ['Jacksonville', 'Miami', 'Tampa', 'Orlando', 'St. Petersburg', 'Hialeah'],
    'Illinois': ['Chicago', 'Aurora', 'Rockford', 'Joliet', 'Naperville', 'Springfield'],
    'Pennsylvania': ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading', 'Scranton'],
    'Ohio': ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton'],
    'Georgia': ['Atlanta', 'Augusta', 'Columbus', 'Savannah', 'Athens', 'Sandy Springs'],
    'North Carolina': ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem', 'Fayetteville'],
    'Michigan': ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Lansing', 'Ann Arbor'],
    
    // United Kingdom - Major Cities
    'England': ['London', 'Birmingham', 'Manchester', 'Liverpool', 'Leeds', 'Sheffield'],
    'Scotland': ['Glasgow', 'Edinburgh', 'Aberdeen', 'Dundee', 'Inverness', 'Stirling'],
    'Wales': ['Cardiff', 'Swansea', 'Newport', 'Wrexham', 'Barry', 'Neath'],
    'Northern Ireland': ['Belfast', 'Derry', 'Lisburn', 'Bangor', 'Newtownabbey', 'Craigavon'],
    
    // Canada - Major Cities
    'Ontario': ['Toronto', 'Ottawa', 'Mississauga', 'Brampton', 'Hamilton', 'London'],
    'Quebec': ['Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Longueuil', 'Sherbrooke'],
    'British Columbia': ['Vancouver', 'Victoria', 'Surrey', 'Burnaby', 'Richmond', 'Abbotsford'],
    'Alberta': ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'Medicine Hat', 'Grande Prairie'],
    
    // Australia - Major Cities
    'New South Wales': ['Sydney', 'Newcastle', 'Central Coast', 'Wollongong', 'Maitland', 'Wagga Wagga'],
    'Victoria': ['Melbourne', 'Geelong', 'Ballarat', 'Bendigo', 'Shepparton', 'Melton'],
    'Queensland': ['Brisbane', 'Gold Coast', 'Sunshine Coast', 'Townsville', 'Cairns', 'Toowoomba'],
    'Western Australia': ['Perth', 'Bunbury', 'Geraldton', 'Kalgoorlie', 'Mandurah', 'Rockingham'],
    
    // Germany - Major Cities
    'Bavaria': ['Munich', 'Nuremberg', 'Augsburg', 'Würzburg', 'Regensburg', 'Ingolstadt'],
    'North Rhine-Westphalia': ['Cologne', 'Düsseldorf', 'Dortmund', 'Essen', 'Duisburg', 'Bochum'],
    'Baden-Württemberg': ['Stuttgart', 'Mannheim', 'Karlsruhe', 'Freiburg', 'Heidelberg', 'Ulm'],
    'Hesse': ['Frankfurt', 'Wiesbaden', 'Kassel', 'Darmstadt', 'Offenbach', 'Wiesbaden'],
    
    // France - Major Cities
    'Île-de-France': ['Paris', 'Boulogne-Billancourt', 'Saint-Denis', 'Versailles', 'Créteil', 'Nanterre'],
    'Auvergne-Rhône-Alpes': ['Lyon', 'Grenoble', 'Saint-Étienne', 'Clermont-Ferrand', 'Annecy', 'Valence'],
    'Provence-Alpes-Côte d\'Azur': ['Marseille', 'Nice', 'Toulon', 'Aix-en-Provence', 'Avignon', 'Cannes'],
    
    // Japan - Major Cities
    'Kanto': ['Tokyo', 'Yokohama', 'Kawasaki', 'Saitama', 'Chiba', 'Sakura'],
    'Kansai': ['Osaka', 'Kyoto', 'Kobe', 'Nara', 'Sakai', 'Higashiosaka'],
    'Chubu': ['Nagoya', 'Hamamatsu', 'Shizuoka', 'Gifu', 'Toyota', 'Okazaki'],
    
    // Singapore - Major Areas
    'Central Region': ['Orchard', 'Marina Bay', 'Raffles Place', 'Sentosa', 'Tanglin', 'Newton'],
    'East Region': ['Bedok', 'Tampines', 'Pasir Ris', 'Changi', 'Simei', 'East Coast'],
    'West Region': ['Jurong', 'Clementi', 'Bukit Batok', 'Woodlands', 'Yishun', 'Choa Chu Kang'],
    
    // UAE - Major Cities
    'Dubai': ['Dubai Marina', 'Downtown Dubai', 'Jumeirah', 'Business Bay', 'Deira', 'Bur Dubai'],
    'Abu Dhabi': ['Abu Dhabi City', 'Al Ain', 'Al Dhafra', 'Khalifa City', 'Mussafah', 'Baniyas'],
    'Sharjah': ['Sharjah City', 'Al Qasba', 'Al Majaz', 'Al Nahda', 'Muwaileh', 'Al Taawun']
  };

  // Auto-focus input on step change
  useEffect(() => {
    if (inputRefs.current[currentStep]) {
      setTimeout(() => {
        inputRefs.current[currentStep]?.focus();
      }, 100);
    }
  }, [currentStep]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !isSubmitting) {
        handleNext();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, currentStep, isSubmitting]);

  const validateStep = () => {
    const newErrors = {};

    switch (currentStep) {
      case 1:
        if (!formData.occupation) {
          newErrors.occupation = 'Please select your occupation';
        }
        break;
      case 2:
        if (!formData.country) {
          newErrors.country = 'Please select your country';
        }
        break;
      case 3:
        if (!formData.state) {
          newErrors.state = 'Please select your state';
        }
        break;
      case 4:
        if (!formData.city) {
          newErrors.city = 'Please select your city';
        }
        break;
      case 5:
        if (formData.monthlyIncome === '') {
          newErrors.monthlyIncome = 'Please enter your monthly income';
        } else if (isNaN(formData.monthlyIncome) || Number(formData.monthlyIncome) < 0) {
          newErrors.monthlyIncome = 'Please enter a valid amount (0 or greater)';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      setErrors({});
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);
    try {
      const submissionData = {
        ...formData,
        monthlyIncome: Number(formData.monthlyIncome),
      };

      await onboardingAPI.complete(submissionData);
      onComplete(submissionData);
    } catch (error) {
      console.error('Onboarding submission error:', error);
      setErrors({ submit: 'Failed to save your information. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getStepIcon = () => {
    switch (currentStep) {
      case 1: return <Briefcase className="w-6 h-6" />;
      case 2:
      case 3:
      case 4: return <MapPin className="w-6 h-6" />;
      case 5: return <DollarSign className="w-6 h-6" />;
      default: return <User className="w-6 h-6" />;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
                <Briefcase className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">What is your occupation?</h2>
              <p className="text-gray-600 mt-2">This helps us personalize your budget experience</p>
            </div>
            
            <div className="space-y-3">
              {[
                { value: 'Student', label: '🎓 Student' },
                { value: 'Employee', label: '💼 Employee' },
                { value: 'Self-Employed', label: '🚀 Self-Employed / Business Owner' },
                { value: 'Freelancer', label: '💻 Freelancer / Consultant' },
                { value: 'Professional', label: '🏢 Professional (Doctor, Lawyer, etc.)' },
                { value: 'Homemaker', label: '🏠 Homemaker' },
                { value: 'Retired', label: '🌴 Retired' },
                { value: 'Other', label: '📝 Other' }
              ].map((option) => (
                <label
                  key={option.value}
                  className={`
                    flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all
                    ${formData.occupation === option.value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <input
                    ref={el => inputRefs.current[1] = el}
                    type="radio"
                    name="occupation"
                    value={option.value}
                    checked={formData.occupation === option.value}
                    onChange={(e) => handleInputChange('occupation', e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center
                    ${formData.occupation === option.value 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-300'
                    }
                  `}>
                    {formData.occupation === option.value && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className="text-gray-900 font-medium">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.occupation && (
              <p className="text-red-500 text-sm">{errors.occupation}</p>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                <MapPin className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Which country do you live in?</h2>
              <p className="text-gray-600 mt-2">Helps us understand your local financial context</p>
            </div>
            
            <select
              ref={el => inputRefs.current[2] = el}
              value={formData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select your country</option>
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
            {errors.country && (
              <p className="text-red-500 text-sm">{errors.country}</p>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                <MapPin className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Which state do you live in?</h2>
              <p className="text-gray-600 mt-2">For regional financial insights</p>
            </div>
            
            <select
              ref={el => inputRefs.current[3] = el}
              value={formData.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select your state</option>
              {(statesByCountry[formData.country] || statesByCountry['India']).map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            {errors.state && (
              <p className="text-red-500 text-sm">{errors.state}</p>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                <MapPin className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Which city do you live in?</h2>
              <p className="text-gray-600 mt-2">For local cost of living analysis</p>
            </div>
            
            <select
              ref={el => inputRefs.current[4] = el}
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select your city</option>
              {citiesByState[formData.state] ? (
                citiesByState[formData.state].map(city => (
                  <option key={city} value={city}>{city}</option>
                ))
              ) : (
                <>
                  <option value="Other">Other (please specify)</option>
                  <option value="Major City">Major City</option>
                  <option value="Suburban">Suburban Area</option>
                  <option value="Rural">Rural Area</option>
                </>
              )}
            </select>
            {errors.city && (
              <p className="text-red-500 text-sm">{errors.city}</p>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-4">
                <DollarSign className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">What is your monthly income?</h2>
            </div>
            
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
              <input
                ref={el => inputRefs.current[5] = el}
                type="number"
                value={formData.monthlyIncome}
                onChange={(e) => handleInputChange('monthlyIncome', e.target.value)}
                placeholder="Enter approximate monthly income"
                min="0"
                className="w-full pl-8 pr-3 p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>
            {errors.monthlyIncome && (
              <p className="text-red-500 text-sm">{errors.monthlyIncome}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"></div>
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl transition-all">
          {/* Progress Bar */}
          <div className="h-1 bg-gray-200 rounded-t-2xl">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStepIcon()}
                <span className="text-sm font-medium text-gray-600">
                  Step {currentStep} of {totalSteps}
                </span>
              </div>
              {/* No close button - onboarding is required */}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <div className="transition-all duration-300">
              {renderStep()}
            </div>
          </div>

          {/* Navigation */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-2xl">
            <div className="flex justify-between">
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors
                  ${currentStep === 1 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }
                `}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                onClick={handleNext}
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isSubmitting ? 'Saving...' : (currentStep === totalSteps ? 'Save & Continue' : 'Next')}</span>
                {currentStep < totalSteps && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errors.submit && (
            <div className="px-6 py-3 bg-red-50 rounded-b-2xl">
              <p className="text-red-500 text-sm text-center">{errors.submit}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
