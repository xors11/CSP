const fs = require('fs');
const path = require('path');

// Explicitly handcrafted, direct natural-language questions for EVERY subject
const bank = {
  '9th Mathematics': {
    mcqs: [
      { q: "What is a Rational Number?", options: ["A number expressed as p/q", "A non-terminating decimal", "A prime number", "An imaginary root"], a: 0 },
      { q: "What is the degree of a linear equation?", options: ["1", "2", "3", "0"], a: 0 },
      { q: "Which formula calculates the area of a triangle given its three sides?", options: ["Heron's Formula", "Pythagoras Theorem", "Euler's Formula", "Baskara's Formula"], a: 0 },
      { q: "What does the y-coordinate represent in Cartesian geometry?", options: ["Distance from x-axis", "Distance from y-axis", "The origin point", "The gradient"], a: 0 },
      { q: "What is the sum of angles in a quadrilateral?", options: ["360 degrees", "180 degrees", "90 degrees", "270 degrees"], a: 0 },
      { q: "Which of the following is a prime number?", options: ["2", "4", "9", "15"], a: 0 },
      { q: "What is the formula for the volume of a cylinder?", options: ["πr²h", "1/3πr²h", "4/3πr³", "2πrh"], a: 0 },
      { q: "What is the probability of an impossible event?", options: ["0", "1", "-1", "0.5"], a: 0 },
      { q: "Which theorem states the square of the hypotenuse equals the sum of the squares of the other two sides?", options: ["Pythagoras Theorem", "Mid-point Theorem", "Thales Theorem", "Euclid's Theorem"], a: 0 },
      { q: "What is the surface area of a cube with side 'a'?", options: ["6a²", "a³", "4a²", "a²"], a: 0 },
      { q: "What is the value of pi (π) approximately?", options: ["3.14", "2.71", "1.41", "1.61"], a: 0 },
      { q: "What is the mode of a dataset?", options: ["The most frequent value", "The average value", "The middle value", "The largest value"], a: 0 }
    ],
    coding: [
      { q: "Write a step-by-step proof for the Mid-point Theorem." },
      { q: "Calculate the surface area and volume of a sphere given its radius." },
      { q: "Solve a system of two linear equations using the substitution method." },
      { q: "Plot a given set of coordinates and find the distance between them." }
    ]
  },
  '10th Mathematics': {
    mcqs: [
      { q: "What does Euclid's Division Lemma state?", options: ["a = bq + r", "a² + b² = c²", "sin² + cos² = 1", "y = mx + c"], a: 0 },
      { q: "What is the discriminant of a quadratic equation ax² + bx + c = 0?", options: ["b² - 4ac", "b² + 4ac", "4ac - b²", "2a / -b"], a: 0 },
      { q: "What is the nth term of an Arithmetic Progression?", options: ["a + (n-1)d", "a + nd", "a - (n-1)d", "n/2(2a + (n-1)d)"], a: 0 },
      { q: "What is the value of tan(45°)?", options: ["1", "0", "Infinity", "0.5"], a: 0 },
      { q: "How many tangents can be drawn to a circle from an external point?", options: ["2", "1", "Infinite", "0"], a: 0 },
      { q: "What is the formula for the volume of a frustum of a cone?", options: ["1/3πh(r1² + r2² + r1r2)", "πr²h", "4/3πr³", "1/3πr²h"], a: 0 },
      { q: "What is the median of a dataset?", options: ["The middle value when sorted", "The average value", "The most frequent value", "The sum of all values"], a: 0 },
      { q: "If two triangles are similar, the ratio of their areas is equal to the ratio of the squares of their:", options: ["Corresponding sides", "Perimeters", "Altitudes", "Medians"], a: 0 },
      { q: "What is the probability of a sure event?", options: ["1", "0", "100", "0.5"], a: 0 },
      { q: "What are the roots of a quadratic equation if the discriminant is zero?", options: ["Real and equal", "Real and distinct", "Imaginary", "Infinite"], a: 0 },
      { q: "What is the distance of a point (x, y) from the origin?", options: ["√(x² + y²)", "x + y", "x² + y²", "x - y"], a: 0 },
      { q: "Which trigonometric ratio corresponds to Opposite/Hypotenuse?", options: ["Sine", "Cosine", "Tangent", "Secant"], a: 0 }
    ],
    coding: [
      { q: "Derive the quadratic formula by completing the square." },
      { q: "Prove that the lengths of tangents drawn from an external point to a circle are equal." },
      { q: "Calculate the mean, median, and mode for a grouped frequency distribution." },
      { q: "Solve a word problem involving the heights and distances using trigonometry." }
    ]
  },
  '11th Mathematics': {
    mcqs: [
      { q: "What is a set?", options: ["A well-defined collection of distinct objects", "A continuous line", "An algebraic variable", "A geometric shape"], a: 0 },
      { q: "What is the derivative of sin(x)?", options: ["cos(x)", "-cos(x)", "sin(x)", "-sin(x)"], a: 0 },
      { q: "What is the formula for nCr (Combinations)?", options: ["n! / (r!(n-r)!)", "n! / (n-r)!", "n! / r!", "n * r"], a: 0 },
      { q: "What does 'i' represent in complex numbers?", options: ["√-1", "√1", "1", "-1"], a: 0 },
      { q: "What is the equation of a circle with center (h,k) and radius r?", options: ["(x-h)² + (y-k)² = r²", "x² + y² = r", "y = mx + c", "(x-h) + (y-k) = r"], a: 0 },
      { q: "What is the limit of (sin x)/x as x approaches 0?", options: ["1", "0", "Infinity", "Undefined"], a: 0 },
      { q: "Which progression multiplies by a constant ratio?", options: ["Geometric Progression", "Arithmetic Progression", "Harmonic Progression", "Fibonacci Sequence"], a: 0 },
      { q: "What is the slope of a line parallel to the x-axis?", options: ["0", "1", "Infinity", "-1"], a: 0 },
      { q: "What does the Binomial Theorem expand?", options: ["Powers of a binomial", "Trigonometric functions", "Logarithms", "Derivatives"], a: 0 },
      { q: "What is an empty set denoted by?", options: ["Ø", "{0}", "U", "N"], a: 0 },
      { q: "What is the derivative of e^x?", options: ["e^x", "x*e^(x-1)", "ln(x)", "1/x"], a: 0 },
      { q: "Which conic section has an eccentricity equal to 1?", options: ["Parabola", "Ellipse", "Hyperbola", "Circle"], a: 0 }
    ],
    coding: [
      { q: "Prove the principle of mathematical induction for the sum of the first n natural numbers." },
      { q: "Find the derivative of a complex rational function using the quotient rule." },
      { q: "Calculate the combinations and permutations for a given set of conditions." },
      { q: "Find the focus, directrix, and vertex of a given parabolic equation." }
    ]
  },
  '9th Science': {
    mcqs: [
      { q: "What is the fundamental unit of life?", options: ["Cell", "Tissue", "Atom", "Organ"], a: 0 },
      { q: "Which organelle is the powerhouse?", options: ["Mitochondria", "Nucleus", "Ribosome", "Vacuole"], a: 0 },
      { q: "What is the formula for velocity?", options: ["Displacement/Time", "Distance/Time", "Mass x Acceleration", "Work/Time"], a: 0 },
      { q: "What is Newton's first law?", options: ["Law of Inertia", "F=ma", "Action/Reaction", "Gravity"], a: 0 },
      { q: "What is a mixture?", options: ["Physical blend of two substances", "Chemically bonded substances", "A pure element", "A compound"], a: 0 },
      { q: "What is the atomic number?", options: ["Number of protons", "Number of neutrons", "Number of electrons", "Atomic mass"], a: 0 },
      { q: "Which of the following is a non-metal?", options: ["Oxygen", "Iron", "Copper", "Gold"], a: 0 },
      { q: "What is the SI unit of force?", options: ["Newton", "Joule", "Watt", "Pascal"], a: 0 },
      { q: "What is the process of solid to gas?", options: ["Sublimation", "Evaporation", "Condensation", "Melting"], a: 0 },
      { q: "What is the speed of light?", options: ["3x10^8 m/s", "3x10^5 m/s", "300 m/s", "3x10^10 m/s"], a: 0 },
      { q: "What are isotopes?", options: ["Same protons, different neutrons", "Same neutrons, different protons", "Different elements", "Same mass"], a: 0 },
      { q: "What causes the Tyndall effect?", options: ["Scattering of light by particles", "Refraction", "Reflection", "Absorption"], a: 0 }
    ],
    coding: [
      { q: "Explain the difference between plant cells and animal cells, highlighting three major organelles." },
      { q: "Write down the three equations of motion and explain what each variable represents." },
      { q: "Describe the process of sublimation and provide two real-life examples of substances that undergo it." },
      { q: "Draw a diagrammatic representation of a cell and describe the role of mitochondria." }
    ]
  },
  '10th Science': {
    mcqs: [
      { q: "Which process do plants use to make food?", options: ["Photosynthesis", "Respiration", "Transpiration", "Digestion"], a: 0 },
      { q: "What states that current is proportional to voltage?", options: ["Ohm's Law", "Faraday's Law", "Newton's Law", "Boyle's Law"], a: 0 },
      { q: "What is the bending of light called?", options: ["Refraction", "Reflection", "Dispersion", "Diffraction"], a: 0 },
      { q: "Which reaction absorbs heat?", options: ["Endothermic", "Exothermic", "Combustion", "Oxidation"], a: 0 },
      { q: "What is the gap between two neurons called?", options: ["Synapse", "Axon", "Dendrite", "Myelin"], a: 0 },
      { q: "Which element shows catenation heavily?", options: ["Carbon", "Oxygen", "Nitrogen", "Iron"], a: 0 },
      { q: "What produces a magnetic field?", options: ["Moving electric charges", "Stationary mass", "Heat", "Light"], a: 0 },
      { q: "What is the pH of a neutral solution?", options: ["7", "0", "14", "1"], a: 0 },
      { q: "What gas is released during photosynthesis?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"], a: 0 },
      { q: "What is the SI unit of resistance?", options: ["Ohm", "Ampere", "Volt", "Watt"], a: 0 },
      { q: "Which mirror is used in car headlights?", options: ["Concave", "Convex", "Plane", "Cylindrical"], a: 0 },
      { q: "What is the chemical formula for Plaster of Paris?", options: ["CaSO4.1/2H2O", "CaSO4.2H2O", "Na2CO3", "NaHCO3"], a: 0 }
    ],
    coding: [
      { q: "State Ohm's Law. Describe an experiment to verify it graphically." },
      { q: "Explain the process of double circulation in human beings and why it is necessary." },
      { q: "Describe the formation of a rainbow in the sky with a detailed explanation of refraction and dispersion." },
      { q: "Differentiate between saponification and esterification reactions with chemical equations." }
    ]
  },
  '11th Physics': {
    mcqs: [
      { q: "What does Kinematics study?", options: ["Motion without considering forces", "Motion considering forces", "Heat transfer", "Light waves"], a: 0 },
      { q: "What is the Work-Energy Theorem?", options: ["Work done equals change in kinetic energy", "Energy is conserved", "Force equals mass times acceleration", "Momentum is conserved"], a: 0 },
      { q: "What is the unit of Torque?", options: ["Newton-meter", "Joule", "Watt", "Pascal"], a: 0 },
      { q: "What does the First Law of Thermodynamics state?", options: ["Energy conservation", "Entropy always increases", "Absolute zero is unreachable", "Heat flows from hot to cold"], a: 0 },
      { q: "What type of wave is sound?", options: ["Longitudinal", "Transverse", "Electromagnetic", "Stationary"], a: 0 },
      { q: "What is the acceleration due to gravity on Earth?", options: ["9.8 m/s²", "10 m/s²", "8.9 m/s²", "9.0 m/s²"], a: 0 },
      { q: "What is Elasticity?", options: ["Ability to regain original shape", "Tendency to break", "Ability to flow", "Resistance to heat"], a: 0 },
      { q: "What principle explains fluid lift (like an airplane wing)?", options: ["Bernoulli's Principle", "Archimedes' Principle", "Pascal's Law", "Boyle's Law"], a: 0 },
      { q: "What is a vector quantity?", options: ["Has magnitude and direction", "Has only magnitude", "Has only direction", "Has neither"], a: 0 },
      { q: "What is the formula for Momentum?", options: ["p = mv", "F = ma", "W = Fd", "E = mc²"], a: 0 },
      { q: "What is angular velocity?", options: ["Rate of change of angular displacement", "Rate of change of speed", "Linear speed along a curve", "Rotational force"], a: 0 },
      { q: "What is escape velocity from Earth?", options: ["11.2 km/s", "3x10^8 m/s", "9.8 m/s", "330 m/s"], a: 0 }
    ],
    coding: [
      { q: "Derive an expression for the time of flight and horizontal range of a projectile." },
      { q: "State and prove the law of conservation of linear momentum using Newton's laws." },
      { q: "State Bernoulli's principle. Derive the equation of continuity for fluid flow." },
      { q: "Discuss the first law of thermodynamics and apply it to an isothermal process." }
    ]
  },
  '12th Physics': {
    mcqs: [
      { q: "What does Coulomb's Law calculate?", options: ["Electrostatic force between charges", "Magnetic force", "Gravitational force", "Nuclear force"], a: 0 },
      { q: "What is the unit of Capacitance?", options: ["Farad", "Ohm", "Henry", "Tesla"], a: 0 },
      { q: "What phenomenon produces electricity from a changing magnetic field?", options: ["Electromagnetic Induction", "Photoelectric Effect", "Superconductivity", "Thermoelectric effect"], a: 0 },
      { q: "Which device converts mechanical energy to AC electrical energy?", options: ["AC Generator", "Transformer", "Motor", "Capacitor"], a: 0 },
      { q: "What is Total Internal Reflection?", options: ["Light reflecting entirely within a denser medium", "Light passing through a prism", "Light bending around an obstacle", "Light scattering in the sky"], a: 0 },
      { q: "What proved the particle nature of light?", options: ["Photoelectric Effect", "Young's Double Slit", "Diffraction", "Polarization"], a: 0 },
      { q: "What logic gate outputs 1 only if all inputs are 1?", options: ["AND gate", "OR gate", "NOT gate", "NAND gate"], a: 0 },
      { q: "What is a P-N junction?", options: ["A boundary between p-type and n-type semiconductors", "A type of transistor", "A radioactive decay boundary", "A magnetic domain wall"], a: 0 },
      { q: "What is the speed of electromagnetic waves in a vacuum?", options: ["3 x 10^8 m/s", "330 m/s", "11.2 km/s", "Infinity"], a: 0 },
      { q: "What does Lenz's Law state?", options: ["Induced current opposes the change causing it", "Current is proportional to voltage", "Force equals mass times acceleration", "Energy is conserved"], a: 0 },
      { q: "What is the SI unit of magnetic flux?", options: ["Weber", "Tesla", "Gauss", "Henry"], a: 0 },
      { q: "What is half-life in radioactivity?", options: ["Time for half the nuclei to decay", "Total lifetime of an atom", "Time for a nucleus to split", "Time to reach absolute zero"], a: 0 }
    ],
    coding: [
      { q: "State Gauss's Law in electrostatics. Use it to find the electric field due to an infinitely long straight wire." },
      { q: "Explain the principle, construction, and working of a transformer. What are energy losses in it?" },
      { q: "Describe Young's Double Slit Experiment and derive the expression for fringe width." },
      { q: "Draw the V-I characteristics of a p-n junction diode in forward and reverse bias." }
    ]
  },
  '11th Chemistry': {
    mcqs: [
      { q: "What does Avogadro's number represent?", options: ["6.022 x 10^23 particles in a mole", "The number of elements", "The speed of light", "The mass of an electron"], a: 0 },
      { q: "Who proposed the planetary model of the atom?", options: ["Bohr", "Thomson", "Rutherford", "Dalton"], a: 0 },
      { q: "What block do Alkali metals belong to?", options: ["s-block", "p-block", "d-block", "f-block"], a: 0 },
      { q: "What type of bond involves sharing electrons?", options: ["Covalent", "Ionic", "Metallic", "Hydrogen"], a: 0 },
      { q: "What does Le Chatelier's principle govern?", options: ["Chemical Equilibrium", "Thermodynamics", "Reaction Rates", "Atomic Structure"], a: 0 },
      { q: "What is oxidation?", options: ["Loss of electrons", "Gain of electrons", "Loss of oxygen", "Gain of hydrogen"], a: 0 },
      { q: "What is the formula for calculating pH?", options: ["-log[H+]", "log[OH-]", "14 - pOH", "mass/volume"], a: 0 },
      { q: "What is a hydrocarbon with double bonds called?", options: ["Alkene", "Alkane", "Alkyne", "Aromatic"], a: 0 },
      { q: "What states that volume is directly proportional to temperature?", options: ["Charles's Law", "Boyle's Law", "Avogadro's Law", "Dalton's Law"], a: 0 },
      { q: "What is Enthalpy?", options: ["Total heat content of a system", "Randomness of a system", "Free energy", "Temperature"], a: 0 },
      { q: "Which orbital is spherical in shape?", options: ["s orbital", "p orbital", "d orbital", "f orbital"], a: 0 },
      { q: "What is the most electronegative element?", options: ["Fluorine", "Oxygen", "Chlorine", "Nitrogen"], a: 0 }
    ],
    coding: [
      { q: "Define hybridization. Explain the geometry and hybridization of methane (CH4) and water (H2O)." },
      { q: "State Le Chatelier's principle. Predict the effect of temperature and pressure on the synthesis of ammonia." },
      { q: "Write the molecular orbital configuration for the oxygen molecule (O2) and calculate its bond order." },
      { q: "Explain the Bohr's model of the hydrogen atom and calculate the energy of the nth orbit." }
    ]
  },
  '12th Chemistry': {
    mcqs: [
      { q: "What is a crystal lattice?", options: ["A symmetrical 3D arrangement of atoms", "A random arrangement of gas molecules", "A liquid solution", "A polymer chain"], a: 0 },
      { q: "What is Molarity?", options: ["Moles of solute per liter of solution", "Moles of solute per kg of solvent", "Mass of solute per volume", "Equivalent weight per liter"], a: 0 },
      { q: "What equation relates cell potential to concentration?", options: ["Nernst Equation", "Arrhenius Equation", "Ideal Gas Equation", "Rate Law Equation"], a: 0 },
      { q: "What is a first-order reaction?", options: ["Rate depends linearly on one reactant", "Rate is independent of concentration", "Rate depends on two reactants", "Rate is zero"], a: 0 },
      { q: "What is adsorption?", options: ["Accumulation of substance on a surface", "Penetration of substance into the bulk", "Mixing of two liquids", "Evaporation of a gas"], a: 0 },
      { q: "Which group contains the noble gases?", options: ["Group 18", "Group 1", "Group 17", "Group 13"], a: 0 },
      { q: "What is a ligand?", options: ["An ion/molecule attached to a central metal", "A pure metal atom", "An isolated electron", "A salt crystal"], a: 0 },
      { q: "What are polymers?", options: ["Large molecules of repeating structural units", "Single isolated atoms", "Diatomic gases", "Simple salts"], a: 0 },
      { q: "Which of the following is a carbohydrate?", options: ["Glucose", "Protein", "Lipid", "DNA"], a: 0 },
      { q: "What is the process of converting an ore into its oxide called?", options: ["Roasting/Calcination", "Smelting", "Refining", "Electrolysis"], a: 0 },
      { q: "What is a primary amine?", options: ["R-NH2", "R2-NH", "R3-N", "R-OH"], a: 0 },
      { q: "What acts as a biological catalyst?", options: ["Enzymes", "Vitamins", "Carbohydrates", "Lipids"], a: 0 }
    ],
    coding: [
      { q: "Derive the integrated rate equation for a first-order chemical reaction." },
      { q: "Explain the working of a galvanic cell using the Nernst equation for cell potential." },
      { q: "Describe the SN1 and SN2 mechanisms of nucleophilic substitution in haloalkanes with examples." },
      { q: "Discuss the structure and functions of DNA and RNA, pointing out three key differences." }
    ]
  },
  '12th Biology': {
    mcqs: [
      { q: "What is the genetic material in most organisms?", options: ["DNA", "RNA", "Protein", "Lipid"], a: 0 },
      { q: "Who is the father of Genetics?", options: ["Gregor Mendel", "Charles Darwin", "Louis Pasteur", "Robert Hooke"], a: 0 },
      { q: "What is the process of DNA copying itself?", options: ["Replication", "Transcription", "Translation", "Mutation"], a: 0 },
      { q: "What theory did Charles Darwin propose?", options: ["Natural Selection", "Acquired Characteristics", "Germ Theory", "Cell Theory"], a: 0 },
      { q: "What vectors transmit Malaria?", options: ["Female Anopheles mosquito", "Male Anopheles mosquito", "Tsetse fly", "Housefly"], a: 0 },
      { q: "What is PCR used for in biotechnology?", options: ["Amplifying DNA segments", "Cutting DNA", "Joining DNA", "Sequencing proteins"], a: 0 },
      { q: "What is the primary source of energy in an ecosystem?", options: ["The Sun", "Producers", "Decomposers", "Geothermal heat"], a: 0 },
      { q: "What is biodiversity?", options: ["Variety of life forms in an area", "Only the plant life", "Only the animal life", "A completely sterile environment"], a: 0 },
      { q: "What causes the greenhouse effect?", options: ["Trapping of heat by atmospheric gases", "Depletion of the ozone layer", "Acid rain", "Deforestation"], a: 0 },
      { q: "What is an antibody?", options: ["A protein produced by the immune system", "A disease-causing microbe", "A red blood cell", "A type of antibiotic drug"], a: 0 },
      { q: "What is the main function of the placenta?", options: ["Nutrient exchange between mother and fetus", "Production of sperm", "Digestion of food", "Pumping blood"], a: 0 },
      { q: "What does ecological succession mean?", options: ["Gradual process of change in species structure", "Sudden extinction of a species", "Migration of birds", "Mutation of a single gene"], a: 0 }
    ],
    coding: [
      { q: "Describe the process of double fertilization in angiosperms with a labeled diagram." },
      { q: "Explain DNA replication in eukaryotes, detailing the role of key enzymes." },
      { q: "State Mendel's Law of Independent Assortment with a suitable dihybrid cross example." },
      { q: "Discuss the applications of recombinant DNA technology in agriculture and medicine." }
    ]
  },
  'Degree Economics': {
    mcqs: [
      { q: "What is Microeconomics?", options: ["Study of individual/firm decisions", "Study of national economy", "Study of global trade", "Study of historical currencies"], a: 0 },
      { q: "What does GDP stand for?", options: ["Gross Domestic Product", "Gross Domestic Profit", "General Domestic Product", "Global Domestic Price"], a: 0 },
      { q: "What happens when demand exceeds supply?", options: ["Prices rise", "Prices fall", "Prices stay the same", "Supply disappears"], a: 0 },
      { q: "What is Inflation?", options: ["General increase in prices", "General decrease in prices", "Increase in population", "Decrease in unemployment"], a: 0 },
      { q: "Who usually controls Monetary Policy?", options: ["The Central Bank", "The President", "The Congress", "The commercial banks"], a: 0 },
      { q: "What is Fiscal Policy?", options: ["Government spending and taxation", "Interest rate adjustment", "Printing new money", "Stock market regulation"], a: 0 },
      { q: "What is Opportunity Cost?", options: ["The value of the next best alternative given up", "The literal dollar price", "The cost of production", "The sunk cost"], a: 0 },
      { q: "What characterizes a Monopoly?", options: ["A single seller in the market", "Many competing sellers", "Two sellers dominating", "A market with no buyers"], a: 0 },
      { q: "What is a Trade Deficit?", options: ["Importing more than exporting", "Exporting more than importing", "Balancing trade perfectly", "Banning all imports"], a: 0 },
      { q: "What does price elasticity of demand measure?", options: ["Responsiveness of demand to a change in price", "Total revenue generated", "Cost of raw materials", "Speed of production"], a: 0 },
      { q: "What is a tariff?", options: ["A tax on imported goods", "A subsidy for local farmers", "A ban on exports", "A domestic income tax"], a: 0 },
      { q: "What is the main goal of a purely capitalist economy?", options: ["Profit maximization and free markets", "Total government control", "Equal wealth distribution", "Abolishing money"], a: 0 }
    ],
    coding: [
      { q: "Explain the Law of Diminishing Marginal Utility and its assumptions." },
      { q: "Compare and contrast Perfect Competition and Monopoly with respect to price and output determination." },
      { q: "Discuss the tools of monetary policy used by the Central Bank to control inflation." },
      { q: "Define GDP. Explain the expenditure and income approaches to measuring national income." }
    ]
  },
  'B.Tech React.js': {
    mcqs: [
      { q: "Which hook is used to perform side effects?", options: ["useEffect", "useState", "useMemo", "useContext"], a: 0 },
      { q: "What is the Virtual DOM?", options: ["A lightweight JS copy of the DOM", "A browser extension", "A state management tool", "A new HTML standard"], a: 0 },
      { q: "What is JSX?", options: ["A syntax extension for JavaScript", "A new programming language", "A CSS preprocessor", "A database query language"], a: 0 },
      { q: "Which hook manages state in a functional component?", options: ["useState", "useEffect", "useRef", "useReducer"], a: 0 },
      { q: "What does Context API solve?", options: ["Prop drilling", "Slow rendering", "Database connecting", "CSS styling"], a: 0 },
      { q: "What is a Higher-Order Component?", options: ["A function returning a component", "A class component", "A global variable", "A DOM element"], a: 0 },
      { q: "Which hook memoizes a computationally expensive value?", options: ["useMemo", "useCallback", "useRef", "useState"], a: 0 },
      { q: "What does React.memo do?", options: ["Prevents unnecessary re-renders", "Fetches data", "Manages global state", "Changes the URL route"], a: 0 },
      { q: "What is the purpose of keys in React lists?", options: ["To uniquely identify elements for rendering", "To encrypt data", "To style items", "To sort arrays"], a: 0 },
      { q: "What hook returns a mutable ref object?", options: ["useRef", "useState", "useEffect", "useMemo"], a: 0 },
      { q: "What is Redux commonly used for?", options: ["Global state management", "Routing", "CSS animations", "Database queries"], a: 0 },
      { q: "How do you conditionally render a component?", options: ["Using ternary operators or logical &&", "Using CSS display:none only", "Using a try-catch block", "You cannot conditionally render in React"], a: 0 }
    ],
    coding: [
      { q: "Write a React component that fetches data from an API on mount and handles loading/error states." },
      { q: "Explain the difference between controlled and uncontrolled components in React forms." },
      { q: "Implement a custom hook `useLocalStorage` to persist state across page reloads." },
      { q: "Discuss React's virtual DOM reconciliation process and the importance of keys in lists." }
    ]
  },
  'B.Tech Python': {
    mcqs: [
      { q: "Which keyword defines a function in Python?", options: ["def", "function", "fun", "define"], a: 0 },
      { q: "What data structure does a dictionary use?", options: ["Key-Value pairs", "Indexed array", "Linked List", "Binary Tree"], a: 0 },
      { q: "What does the GIL do in Python?", options: ["Prevents multiple threads from executing Python bytecodes at once", "Speeds up code execution", "Garbage collects memory", "Compiles code to C"], a: 0 },
      { q: "What is a decorator?", options: ["A function modifying another function", "A CSS style", "A syntax error", "A class constructor"], a: 0 },
      { q: "Which of the following is mutable?", options: ["List", "Tuple", "String", "Integer"], a: 0 },
      { q: "What does 'self' refer to in a class?", options: ["The current instance of the class", "The parent class", "A global variable", "The Python interpreter"], a: 0 },
      { q: "What is a lambda function?", options: ["A small anonymous function", "A massive class", "A built-in module", "A database query"], a: 0 },
      { q: "What does the 'yield' keyword do?", options: ["Returns a generator object", "Stops the program", "Throws an exception", "Imports a module"], a: 0 },
      { q: "Which library is used for data manipulation?", options: ["Pandas", "Flask", "Django", "PyGame"], a: 0 },
      { q: "What are Dunder methods?", options: ["Methods with double underscores (e.g., __init__)", "Deprecated methods", "Methods imported from C", "Syntax errors"], a: 0 },
      { q: "How do you handle exceptions in Python?", options: ["try-except", "try-catch", "do-while", "throw-catch"], a: 0 },
      { q: "What does pep8 refer to?", options: ["A style guide for Python code", "A Python package installer", "A web framework", "A database driver"], a: 0 }
    ],
    coding: [
      { q: "Write a Python script to parse a JSON file, filter records based on a key, and write the output to a CSV file." },
      { q: "Explain the concept of decorators in Python and write a decorator that measures execution time of a function." },
      { q: "Implement a custom generator in Python to yield Fibonacci numbers up to a limit." },
      { q: "Explain the difference between deep copy and shallow copy in Python with code examples." }
    ]
  },
  'B.Tech Machine Learning': {
    mcqs: [
      { q: "What is Supervised Learning?", options: ["Training a model on labeled data", "Learning without data", "Clustering unknown data", "A reinforcement process"], a: 0 },
      { q: "What is Overfitting?", options: ["Model learns the training data too well, failing to generalize", "Model underperforms on training data", "Model runs out of memory", "Model trains too fast"], a: 0 },
      { q: "Which algorithm is used for Classification?", options: ["Logistic Regression", "Linear Regression", "K-Means", "PCA"], a: 0 },
      { q: "What does Gradient Descent optimize?", options: ["It minimizes the loss function", "It maximizes the error", "It sorts the dataset", "It compresses the images"], a: 0 },
      { q: "What is a Neural Network?", options: ["Layers of interconnected nodes mimicking the brain", "A physical computer cluster", "A sorting algorithm", "A SQL database"], a: 0 },
      { q: "What is K-Means?", options: ["An unsupervised clustering algorithm", "A supervised classification algorithm", "A neural network architecture", "A reinforcement learning agent"], a: 0 },
      { q: "What does Cross-Validation do?", options: ["Evaluates model performance on different subsets of data", "Increases the dataset size infinitely", "Deletes outliers", "Converts text to numbers"], a: 0 },
      { q: "What is a Hyperparameter?", options: ["A configuration set before the learning process begins", "A weight learned during training", "The final output prediction", "The raw input data"], a: 0 },
      { q: "What is Natural Language Processing (NLP)?", options: ["AI dealing with human language", "AI for image recognition", "AI for robotic movement", "AI for playing chess"], a: 0 },
      { q: "Which metric is best for imbalanced datasets?", options: ["F1-Score", "Accuracy", "Mean Squared Error", "R-squared"], a: 0 },
      { q: "What is an Epoch?", options: ["One full pass of the training dataset through the algorithm", "A single weight update", "The total training time in seconds", "The final accuracy score"], a: 0 },
      { q: "What does a Convolutional Neural Network (CNN) excel at?", options: ["Image recognition", "Tabular data prediction", "Time series forecasting", "Text translation"], a: 0 }
    ],
    coding: [
      { q: "Explain the bias-variance tradeoff and how regularization (L1/L2) helps in mitigating overfitting." },
      { q: "Describe the step-by-step math and update rules of Gradient Descent optimization." },
      { q: "Explain the difference between K-Means clustering and K-Nearest Neighbors (KNN) classification." },
      { q: "Describe how a Convolutional Neural Network (CNN) extracts features from an image using filters." }
    ]
  },
  'B.Tech Web Development': {
    mcqs: [
      { q: "What does HTML stand for?", options: ["HyperText Markup Language", "HyperText Machine Language", "High-Level Text Language", "Hyper Transfer Markup Language"], a: 0 },
      { q: "Which property in CSS changes the background color?", options: ["background-color", "color", "bgcolor", "background-style"], a: 0 },
      { q: "What is the DOM?", options: ["Document Object Model", "Data Object Model", "Dynamic Output Method", "Document Output Mechanism"], a: 0 },
      { q: "What does a REST API use for communication?", options: ["HTTP requests", "Direct database connections", "FTP protocols", "SSH tunnels"], a: 0 },
      { q: "What is Responsive Design?", options: ["Designing for different screen sizes", "Writing fast server code", "Designing database schemas", "Creating vector graphics"], a: 0 },
      { q: "What is the purpose of JWT?", options: ["Securely transmitting information as a JSON object", "Styling web pages", "Querying a database", "Bundling JavaScript files"], a: 0 },
      { q: "Which tag is used to include external JavaScript?", options: ["<script src='...'>", "<js href='...'>", "<link rel='...'>", "<code src='...'>"], a: 0 },
      { q: "What is Node.js?", options: ["A JavaScript runtime built on Chrome's V8 engine", "A frontend UI framework", "A relational database", "A CSS preprocessor"], a: 0 },
      { q: "What is CORS?", options: ["Cross-Origin Resource Sharing", "Cascading Object Rendering System", "Centralized Output Routing Server", "Client Object Request System"], a: 0 },
      { q: "What is the difference between let and var?", options: ["let is block-scoped, var is function-scoped", "let is a constant, var is mutable", "There is no difference", "var is only for numbers"], a: 0 },
      { q: "Which HTTP method is used to update data?", options: ["PUT", "GET", "POST", "DELETE"], a: 0 },
      { q: "What does CSS Flexbox do?", options: ["Provides a more efficient way to lay out, align and distribute space", "Connects to a database", "Encrypts web traffic", "Executes JavaScript functions"], a: 0 }
    ],
    coding: [
      { q: "Write an Express.js route handler that accepts a POST request with JSON payload, validates the input, and returns a response." },
      { q: "Explain the CSS Box Model and how `box-sizing: border-box` alters layout calculations." },
      { q: "Implement a simple JWT authentication middleware in Node.js." },
      { q: "Describe the differences between RESTful APIs and GraphQL in terms of data fetching efficiency." }
    ]
  },
  'B.Tech Operating Systems': {
    mcqs: [
      { q: "What is the Kernel?", options: ["The core of the OS that manages resources", "The user interface", "A web browser", "A device driver"], a: 0 },
      { q: "What is a Deadlock?", options: ["Processes waiting on each other indefinitely", "A CPU overheating", "A network timeout", "A memory leak"], a: 0 },
      { q: "What does Virtual Memory do?", options: ["Simulates additional RAM using disk space", "Increases CPU clock speed", "Encrypts the hard drive", "Connects to cloud storage"], a: 0 },
      { q: "What is a Context Switch?", options: ["Saving the state of a process to load another", "Switching monitors", "Turning off the computer", "Changing user accounts"], a: 0 },
      { q: "What is a Semaphore?", options: ["A variable used to control access to a common resource", "A networking protocol", "A file system format", "A CPU cooling fan"], a: 0 },
      { q: "What is Paging?", options: ["Memory management scheme to eliminate contiguous allocation", "Writing data to a printer", "Sending packets over a network", "Overclocking a processor"], a: 0 },
      { q: "What is Thrashing?", options: ["System spending more time paging than executing", "Fast execution of code", "A virus infecting files", "Encrypting data rapidly"], a: 0 },
      { q: "What does a Scheduler do?", options: ["Selects the next process to be executed", "Deletes old files", "Downloads software updates", "Manages screen resolution"], a: 0 },
      { q: "What is an Interrupt?", options: ["A signal to the CPU indicating an event needs attention", "A power failure", "A user closing an app", "A network disconnect"], a: 0 },
      { q: "Which algorithm is used for CPU scheduling?", options: ["Round Robin", "Dijkstra's Algorithm", "Binary Search", "Bubble Sort"], a: 0 },
      { q: "What is an Orphan process?", options: ["A process whose parent process has terminated", "A process with no memory", "A process that is sleeping", "A process with maximum priority"], a: 0 },
      { q: "What is GUI?", options: ["Graphical User Interface", "Global User Index", "General Utility Interface", "Graphic Unified Interaction"], a: 0 }
    ],
    coding: [
      { q: "Explain the four necessary conditions for a deadlock to occur and describe one deadlock prevention strategy." },
      { q: "Describe the differences between paging and segmentation in memory management." },
      { q: "Write a pseudo-code or explain the Producer-Consumer problem using semaphores." },
      { q: "Compare Round Robin and Shortest Job First (SJF) CPU scheduling algorithms." }
    ]
  },
  'B.Tech DBMS': {
    mcqs: [
      { q: "What is a Primary Key?", options: ["A unique identifier for a record", "A link to another table", "An index for search", "A stored procedure"], a: 0 },
      { q: "What does ACID stand for?", options: ["Atomicity, Consistency, Isolation, Durability", "Accuracy, Control, Isolation, Data", "Always Consistent Independent Data", "Atomicity, Consistency, Integrity, Durability"], a: 0 },
      { q: "What is Normalization?", options: ["Organizing data to minimize redundancy", "Encrypting passwords", "Connecting to frontend", "Maximizing data duplication"], a: 0 },
      { q: "What does an SQL JOIN do?", options: ["Combines rows from two or more tables", "Deletes a table", "Creates a new user", "Indexes a column"], a: 0 },
      { q: "What is a Foreign Key?", options: ["A field that identifies a row of another table", "A primary key", "A candidate key", "A super key"], a: 0 },
      { q: "What is the purpose of Indexing?", options: ["To speed up data retrieval", "To encrypt data", "To compress the database", "To enforce referential integrity"], a: 0 },
      { q: "Which command is a DDL command?", options: ["CREATE", "SELECT", "INSERT", "UPDATE"], a: 0 },
      { q: "What is a View in SQL?", options: ["A virtual table based on a query", "A physical copy of a table", "A user interface window", "A backup file"], a: 0 },
      { q: "What does a Transaction represent?", options: ["A logical unit of work", "A network packet", "A single row", "A database backup"], a: 0 },
      { q: "What is NoSQL?", options: ["A non-relational database management system", "A programming language", "A strict SQL standard", "A hardware storage device"], a: 0 },
      { q: "What is a Trigger in SQL?", options: ["A stored procedure that automatically runs on an event", "A command to delete the database", "A primary key constraint", "A network error"], a: 0 },
      { q: "Which normal form removes transitive dependencies?", options: ["Third Normal Form (3NF)", "First Normal Form (1NF)", "Second Normal Form (2NF)", "Boyce-Codd Normal Form (BCNF)"], a: 0 }
    ],
    coding: [
      { q: "Define ACID properties of a transaction and explain how rollback is achieved in case of failures." },
      { q: "Given a table schema, write SQL queries to find the second highest salary using subqueries and window functions." },
      { q: "Explain 1NF, 2NF, and 3NF database normalization forms with examples." },
      { q: "Explain the difference between clustered and non-clustered indexes in database indexing." }
    ]
  },
  'B.Tech Computer Networks': {
    mcqs: [
      { q: "How many layers are in the OSI model?", options: ["7", "4", "5", "9"], a: 0 },
      { q: "What protocol operates at the Transport Layer?", options: ["TCP", "IP", "HTTP", "Ethernet"], a: 0 },
      { q: "What does an IP address do?", options: ["Identifies a device on a network", "Encrypts traffic", "Resolves domain names", "Connects to a database"], a: 0 },
      { q: "What is the function of a Router?", options: ["Forwards data packets between networks", "Acts as a simple hub", "Stores website files", "Renders HTML"], a: 0 },
      { q: "What does DNS stand for?", options: ["Domain Name System", "Data Network Server", "Dynamic Naming Standard", "Digital Network Security"], a: 0 },
      { q: "What is a MAC address?", options: ["A unique hardware identifier for a network interface", "A logical IP address", "A routing table entry", "A port number"], a: 0 },
      { q: "What is the purpose of Subnetting?", options: ["To divide a network into smaller networks", "To encrypt traffic", "To combine multiple networks", "To block IP addresses"], a: 0 },
      { q: "Which layer handles routing?", options: ["Network Layer", "Physical Layer", "Application Layer", "Data Link Layer"], a: 0 },
      { q: "What does HTTPS use for security?", options: ["SSL/TLS", "FTP", "ICMP", "ARP"], a: 0 },
      { q: "What is a Firewall?", options: ["A security system monitoring incoming/outgoing traffic", "A physical cable", "A routing algorithm", "A web browser"], a: 0 },
      { q: "What is the size of an IPv4 address?", options: ["32 bits", "128 bits", "64 bits", "16 bits"], a: 0 },
      { q: "What protocol is used for sending emails?", options: ["SMTP", "FTP", "HTTP", "SNMP"], a: 0 }
    ],
    coding: [
      { q: "Explain the flow control and error control mechanisms used in TCP (Three-way handshake and sliding window)." },
      { q: "Describe the journey of a packet from a web browser to a web server, including DNS, IP, and MAC address resolution." },
      { q: "Calculate the subnet mask and host range for a network address 192.168.1.0/26." },
      { q: "Compare and contrast IPv4 and IPv6 protocols, listing four key enhancements in IPv6." }
    ]
  },
  'B.Tech Software Engineering': {
    mcqs: [
      { q: "What is the Agile Methodology?", options: ["Iterative development emphasizing flexibility", "A sequential waterfall process", "A hardware design framework", "A specific programming language"], a: 0 },
      { q: "What are Design Patterns?", options: ["Typical solutions to common software problems", "Specific code implementations", "Database schemas", "Network architectures"], a: 0 },
      { q: "What is Git used for?", options: ["Version control", "Compiling code", "Writing unit tests", "Hosting a database"], a: 0 },
      { q: "What does Unit Testing do?", options: ["Tests individual components of software", "Tests the entire system end-to-end", "Tests performance under load", "Tests user acceptance"], a: 0 },
      { q: "What is Continuous Integration (CI)?", options: ["Frequently merging working copies to a shared mainline", "Deploying code manually", "Writing documentation", "Refactoring code"], a: 0 },
      { q: "What does UML stand for?", options: ["Unified Modeling Language", "Universal Markup Language", "Unified Machine Logic", "Universal Modeling Logic"], a: 0 },
      { q: "What are Microservices?", options: ["Structuring an app as loosely coupled services", "A monolithic architecture", "A single large database", "A programming language"], a: 0 },
      { q: "What is Refactoring?", options: ["Restructuring code without changing its behavior", "Adding new features", "Writing unit tests", "Deploying the application"], a: 0 },
      { q: "What is the Waterfall model?", options: ["A linear, sequential approach to development", "An iterative loop process", "A flexible prototyping methodology", "An automated deployment script"], a: 0 },
      { q: "What does Scrum focus on?", options: ["Managing iterative development via sprints", "A database indexing strategy", "A hardware configuration protocol", "A testing framework"], a: 0 },
      { q: "What is White Box Testing?", options: ["Testing with knowledge of internal code structure", "Testing without knowing the internal code", "Testing the UI only", "Testing network latency"], a: 0 },
      { q: "What is an MVP (Minimum Viable Product)?", options: ["A product with just enough features to satisfy early customers", "The most valuable programmer", "The final completed product", "A prototype that does not work"], a: 0 }
    ],
    coding: [
      { q: "Explain the Agile Scrum framework, including roles, artifacts, and ceremonies." },
      { q: "Describe three software design patterns (Singleton, Factory, Observer) and their typical use cases." },
      { q: "Explain the concept of CI/CD pipelines and how they improve software quality and deployment speed." },
      { q: "Differentiate between white-box testing and black-box testing methodologies with examples." }
    ]
  },
  'B.Tech Data Structures': {
    mcqs: [
      { q: "What is an Array?", options: ["Elements stored in contiguous memory", "A dynamic tree", "A linked list", "A database table"], a: 0 },
      { q: "What principle does a Stack follow?", options: ["LIFO (Last In First Out)", "FIFO (First In First Out)", "Random Access", "Hierarchical Access"], a: 0 },
      { q: "What principle does a Queue follow?", options: ["FIFO (First In First Out)", "LIFO (Last In First Out)", "Binary Search", "Hash collision"], a: 0 },
      { q: "What is the time complexity of searching in a Binary Search Tree (average)?", options: ["O(log n)", "O(n)", "O(1)", "O(n²)"], a: 0 },
      { q: "What is a Linked List?", options: ["Elements pointing to the next node", "Contiguous memory array", "A hash map", "A stack"], a: 0 },
      { q: "What is the purpose of a Hash Table?", options: ["Fast data retrieval via key mapping", "Sorting elements", "Balancing a tree", "Linear sequential access"], a: 0 },
      { q: "What is a Graph?", options: ["A non-linear structure of nodes and edges", "A strictly linear array", "A simple integer", "A sorting function"], a: 0 },
      { q: "What does Time Complexity describe?", options: ["Computational time taken by an algorithm", "Physical area of code", "Memory space used", "Number of lines of code"], a: 0 },
      { q: "Which algorithm sorts by repeatedly swapping adjacent elements?", options: ["Bubble Sort", "Merge Sort", "Quick Sort", "Binary Search"], a: 0 },
      { q: "What is a Heap?", options: ["A complete binary tree satisfying the heap property", "A simple linked list", "A circular queue", "An undirected graph"], a: 0 },
      { q: "What is Dynamic Programming?", options: ["Solving complex problems by breaking them into overlapping subproblems", "Writing code dynamically", "A database query", "A frontend framework"], a: 0 },
      { q: "What is the worst-case time complexity of Quick Sort?", options: ["O(n²)", "O(n log n)", "O(n)", "O(log n)"], a: 0 }
    ],
    coding: [
      { q: "Write a pseudo-code to implement binary search recursively and state its time complexity." },
      { q: "Explain the process of inserting a node in a Binary Search Tree (BST) and traversing it in-order." },
      { q: "Implement a Stack using a Single Linked List in Java/Python." },
      { q: "Differentiate between BFS and DFS graph traversal algorithms with execution examples." }
    ]
  },
  'B.Tech Java': {
    mcqs: [
      { q: "What is JVM in Java?", options: ["Java Virtual Machine", "Java Variable Machine", "Java Verified Method", "Java Visual Machine"], a: 0 },
      { q: "Which keyword is used to inherit a class?", options: ["extends", "implement", "inherit", "super"], a: 0 },
      { q: "Which method is the entry point of Java program?", options: ["main()", "start()", "init()", "run()"], a: 0 },
      { q: "Which of the following is not a primitive datatype?", options: ["String", "int", "float", "char"], a: 0 },
      { q: "Which concept allows multiple methods with same name?", options: ["Polymorphism", "Encapsulation", "Inheritance", "Abstraction"], a: 0 },
      { q: "Which loop executes at least once?", options: ["do-while", "for", "while", "nested loop"], a: 0 },
      { q: "Which keyword is used to create object?", options: ["new", "class", "object", "this"], a: 0 },
      { q: "Which package contains Scanner class?", options: ["java.util", "java.io", "java.lang", "java.net"], a: 0 },
      { q: "What is method overloading?", options: ["Same method with different parameters", "Same method in different classes", "Different method names", "Multiple classes"], a: 0 },
      { q: "Which keyword refers to current object?", options: ["this", "self", "current", "object"], a: 0 },
      { q: "Which operator is used for comparison?", options: ["==", "=", ":=", "!="], a: 0 },
      { q: "Which exception occurs when dividing by zero?", options: ["ArithmeticException", "IOException", "NullPointerException", "ArrayException"], a: 0 },
      { q: "What is encapsulation?", options: ["Data hiding", "Multiple inheritance", "Looping", "Compilation"], a: 0 },
      { q: "Which keyword prevents inheritance?", options: ["final", "stop", "static", "const"], a: 0 },
      { q: "Which collection stores unique values?", options: ["Set", "List", "ArrayList", "Queue"], a: 0 },
      { q: "Which class is used for dynamic arrays?", options: ["ArrayList", "HashMap", "TreeSet", "Stack"], a: 0 },
      { q: "Which keyword handles exceptions?", options: ["catch", "throw", "throws", "error"], a: 0 },
      { q: "Java supports which type of inheritance?", options: ["Single inheritance", "Multiple inheritance using classes", "Circular inheritance", "Hybrid inheritance directly"], a: 0 },
      { q: "Which access modifier is most secure?", options: ["private", "public", "protected", "default"], a: 0 },
      { q: "Which function converts String to integer?", options: ["parseInt()", "valueOf()", "toString()", "convert()"], a: 0 },
      { q: "What is abstraction?", options: ["Hiding implementation details", "Data duplication", "Code repetition", "Compilation"], a: 0 },
      { q: "Which keyword is used for interface implementation?", options: ["implements", "inherit", "extends", "override"], a: 0 },
      { q: "Which memory stores objects?", options: ["Heap", "Stack", "ROM", "Cache"], a: 0 },
      { q: "Which thread method starts execution?", options: ["start()", "execute()", "init()", "runThread()"], a: 0 },
      { q: "Which statement is used to stop loop?", options: ["break", "stop", "terminate", "exit"], a: 0 }
    ],
    coding: [
      { q: "Write a Java program to reverse a string." },
      { q: "Write a Java program to check whether a number is palindrome or not." },
      { q: "Write a Java program to print Fibonacci series up to N terms." },
      { q: "Write a Java program to check whether a number is prime." },
      { q: "Write a Java program to find factorial using recursion." },
      { q: "Write a Java program to find largest element in an array." },
      { q: "Write a Java program to sort an array using bubble sort." },
      { q: "Create a class Animal and inherit it into Dog class." },
      { q: "Write a Java program to handle division by zero using try-catch." },
      { q: "Write a Java program to demonstrate method overloading." }
    ]
  },
  '9th Social Studies': {
    mcqs: [
      { q: "What is the primary causes of the French Revolution?", options: ["Social inequality and economic crisis", "Invasion of neighboring countries", "Discovery of new trade routes", "Establishment of new scientific theories"], a: 0 },
      { q: "Which line of latitude passes through the middle of India?", options: ["Tropic of Cancer", "Equator", "Tropic of Capricorn", "Prime Meridian"], a: 0 },
      { q: "What type of government does India have?", options: ["Democratic Republic", "Absolute Monarchy", "Military Dictatorship", "Oligarchy"], a: 0 },
      { q: "Which revolution introduced the concept of liberty, equality, and fraternity?", options: ["French Revolution", "Russian Revolution", "Industrial Revolution", "American Revolution"], a: 0 },
      { q: "What is the study of population statistics called?", options: ["Demography", "Geography", "Sociology", "Cartography"], a: 0 },
      { q: "Who is known as the father of the Indian Constitution?", options: ["Dr. B.R. Ambedkar", "Mahatma Gandhi", "Jawaharlal Nehru", "Sardar Vallabhbhai Patel"], a: 0 },
      { q: "Which of the following is a non-farming activity in rural areas?", options: ["Dairy farming", "Sowing seeds", "Harvesting crops", "Plowing fields"], a: 0 },
      { q: "What defines the standard meridian of India?", options: ["82°30' E", "88°30' E", "97°25' E", "68°7' E"], a: 0 },
      { q: "Which body guarantees the fundamental rights of Indian citizens?", options: ["The Judiciary", "The Parliament", "The Cabinet", "The Prime Minister"], a: 0 },
      { q: "What is the main resource used in modern farming under the Green Revolution?", options: ["HYV seeds and chemical fertilizers", "Organic manure and wooden tools", "Traditional seeds and hand watering", "Rainwater harvesting alone"], a: 0 },
      { q: "What was the main reason for the Russian Revolution of 1917?", options: ["Widespread poverty and Tsar's autocratic rule", "A sudden natural disaster", "Invasion by the British Empire", "Success of the space program"], a: 0 },
      { q: "What does the term 'Sovereign' mean in the Preamble of the Indian Constitution?", options: ["People have supreme right to make decisions", "Head of state is an elected person", "No discrimination on grounds of religion", "All citizens are equal before law"], a: 0 }
    ],
    coding: [
      { q: "Explain the causes of the French Revolution and its impact on modern democratic values." },
      { q: "Differentiate between weather and climate. Explain three factors affecting the climate of a place." },
      { q: "What are the main features of a democratic government? Differentiate it from non-democratic forms." },
      { q: "Discuss the role of the Green Revolution in making India self-sufficient in food grains." }
    ]
  },
  '10th English': {
    mcqs: [
      { q: "Who is the author of 'A Letter to God'?", options: ["G.L. Fuentes", "Nelson Mandela", "Robert Frost", "Liam O'Flaherty"], a: 0 },
      { q: "What does the dust of snow represent in Robert Frost's poem?", options: ["A sudden change in mood and healing power of nature", "A terrible storm", "Cold winter weather", "Sadness and depression"], a: 0 },
      { q: "According to Nelson Mandela, what is the greatest wealth of a nation?", options: ["Its people", "Its minerals and gems", "Its military power", "Its technology"], a: 0 },
      { q: "What is the central theme of 'Fire and Ice'?", options: ["Destruction of the world through desire and hatred", "The beauty of nature in winter", "The struggle between heat and cold", "The scientific explanation of global warming"], a: 0 },
      { q: "Why did Lencho write a letter to God?", options: ["His crops were ruined by a hailstorm and he needed money", "He wanted to thank God for the rain", "He wanted to become a priest", "He was lonely and sad"], a: 0 },
      { q: "Who was the young seagull afraid to fly in 'His First Flight'?", options: ["He lacked confidence and feared his wings wouldn't support him", "He was injured", "He wanted to stay with his parents", "The wind was too strong"], a: 0 },
      { q: "What did the postmaster do after reading Lencho's letter?", options: ["He decided to help Lencho by collecting money", "He threw the letter in the dustbin", "He mocked Lencho's ignorance", "He sent the police to investigate"], a: 0 },
      { q: "What did Mandela learn about courage?", options: ["It is the triumph over fear, not the absence of it", "It is having no fear at all", "It is the ability to fight without fear", "It is running away from danger safely"], a: 0 },
      { q: "What is the name of the dog in 'A Triumph of Surgery'?", options: ["Tricki", "Joe", "Hector", "Buster"], a: 0 },
      { q: "Why was Mrs. Pumphrey worried about Tricki?", options: ["He was listless and overfed, showing no interest in food", "He ran away", "He was barking too much", "He had a high fever"], a: 0 },
      { q: "Who is the midnight visitor in Robert Arthur's story?", options: ["Ausable, a secret agent", "Max, a rival secret agent", "Fowler, a young writer", "Henry, a waiter"], a: 0 },
      { q: "What did Horace Danby like to collect?", options: ["Rare and expensive books", "Gold coins", "Antique paintings", "Stamps and postcards"], a: 0 }
    ],
    coding: [
      { q: "Write a character sketch of Lencho from 'A Letter to God', highlighting his faith in God." },
      { q: "Analyze the central theme of the poem 'Fire and Ice' by Robert Frost." },
      { q: "Draft a formal letter to the Editor complaining about the frequent power cuts in your locality." },
      { q: "Explain the significance of the title 'The Midnight Visitor'." }
    ]
  }
};

// Fill in remaining subjects with standard direct questions
const subjectsList = [
  '9th Mathematics', '9th Science', '9th Social Studies',
  '10th Mathematics', '10th Science', '10th English',
  '11th Physics', '11th Chemistry', '11th Mathematics',
  '12th Physics', '12th Chemistry', '12th Biology',
  'B.Tech Data Structures', 'B.Tech React.js', 'B.Tech Python',
  'B.Tech Machine Learning', 'B.Tech Web Development', 
  'B.Tech Operating Systems', 'B.Tech DBMS', 'B.Tech Computer Networks', 
  'B.Tech Software Engineering', 'Degree Economics', 'B.Tech Java'
];

const fallbackBank = (subject) => {
  let mcqs = [];
  for(let i=1; i<=12; i++) {
    mcqs.push({
      q: `What is the primary function of core concept ${i} in ${subject}?`,
      options: [`Valid feature ${i}`, `Incorrect assumption`, `Unrelated metric`, `Deprecated element`],
      a: 0
    });
  }
  let coding = [];
  for(let i=1; i<=4; i++) {
    coding.push({ q: `Explain how to apply the core principles of ${subject} to solve a real-world scenario.` });
  }
  return { mcqs, coding };
};

const finalBank = {};

subjectsList.forEach(subject => {
  if (bank[subject]) {
    finalBank[subject] = bank[subject];
  } else {
    // For any missing subjects, generate a fallback
    finalBank[subject] = fallbackBank(subject);
  }
});

const fileContent = `// Auto-generated Massive Question Bank with 100% DIRECT NATURAL QUESTIONS
// Overhauled entirely to match the explicit direct Java format

const finalQuestionBank = ${JSON.stringify(finalBank, null, 2)};

const getQuestionsForSubjects = (subjectsStr) => {
  const subjects = subjectsStr.split(',').map(s => s.trim());
  let allMcqs = [];
  let allCoding = [];

  subjects.forEach(subject => {
    let bank = finalQuestionBank[subject];
    if (!bank) {
      bank = finalQuestionBank['B.Tech Java'];
    }
    
    const mcqsCopy = bank.mcqs.map(q => {
      const correctAnswer = q.options[q.a];
      const shuffledOptions = [...q.options].sort(() => 0.5 - Math.random());
      const newAnswerIndex = shuffledOptions.indexOf(correctAnswer);
      
      return {
        q: q.q,
        options: shuffledOptions,
        a: newAnswerIndex,
        subject: subject
      };
    });

    // Shuffle the completely distinct direct questions and pick exactly 10
    const selectedMcqs = mcqsCopy.sort(() => 0.5 - Math.random()).slice(0, 10);
    const shuffledCoding = [...bank.coding].sort(() => 0.5 - Math.random());
    const selectedCoding = shuffledCoding.slice(0, 3).map(q => ({...q, subject}));

    allMcqs = [...allMcqs, ...selectedMcqs];
    allCoding = [...allCoding, ...selectedCoding];
  });

  return {
    mcqs: allMcqs,
    coding: allCoding
  };
};

module.exports = { getQuestionsForSubjects };
`;

fs.writeFileSync(path.join(__dirname, 'questionBank.js'), fileContent);
console.log('Successfully remapped ALL subjects to direct, non-templated natural questions!');
