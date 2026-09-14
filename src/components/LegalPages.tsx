import React from 'react';
import { ArrowLeft, Shield, FileText, Mail, Info, Copyright, Heart } from 'lucide-react';
import { SEOHead } from './SEOHead';

export type LegalPageType = 'privacy' | 'terms' | 'about' | 'contact' | 'dmca';

interface LegalPagesProps {
  page: LegalPageType;
  onBack: () => void;
}

export const LegalPages: React.FC<LegalPagesProps> = ({ page, onBack }) => {
  const getPageInfo = () => {
    switch (page) {
      case 'privacy':
        return {
          title: 'Privacy Policy | Lyrifi',
          heading: 'Privacy Policy',
          description: 'Learn how Lyrifi collects, uses, and safeguards your data in compliance with Google AdSense, GDPR, and privacy standards.',
          icon: <Shield className="w-7 h-7 text-pink-500" />
        };
      case 'terms':
        return {
          title: 'Terms of Service | Lyrifi',
          heading: 'Terms of Service',
          description: 'Read the Terms of Service governing the use of Lyrifi and its synchronized lyrics discovery platform.',
          icon: <FileText className="w-7 h-7 text-violet-500" />
        };
      case 'about':
        return {
          title: 'About Us | Lyrifi',
          heading: 'About Lyrifi',
          description: 'Discover the story behind Lyrifi — the premier Tamil and Tanglish lyrics platform built with Apple Music synchronized line-glow styling.',
          icon: <Info className="w-7 h-7 text-rose-500" />
        };
      case 'contact':
        return {
          title: 'Contact Us | Lyrifi',
          heading: 'Contact Us',
          description: 'Get in touch with the Lyrifi team for inquiries, corrections, song requests, or support.',
          icon: <Mail className="w-7 h-7 text-cyan-500" />
        };
      case 'dmca':
        return {
          title: 'DMCA & Copyright Policy | Lyrifi',
          heading: 'DMCA & Copyright Policy',
          description: 'Our copyright disclaimer, fair use notice, and DMCA takedown request procedure.',
          icon: <Copyright className="w-7 h-7 text-amber-500" />
        };
    }
  };

  const info = getPageInfo();

  return (
    <div className="min-h-screen bg-[#07080b] text-white pb-32 pt-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto animate-fadeIn">
      <SEOHead
        title={info.title}
        description={info.description}
        canonicalUrl={`https://lyrifi-data.vercel.app/${page}`}
      />

      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold text-gray-300 hover:text-white transition mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Lyrifi</span>
      </button>

      {/* Header Banner */}
      <div className="flex items-center gap-4 p-6 rounded-3xl bg-gradient-to-r from-white/[0.05] to-white/[0.01] border border-white/10 shadow-2xl mb-10">
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
          {info.icon}
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{info.heading}</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Last updated: September 14, 2026 • Lyrifi Official</p>
        </div>
      </div>

      {/* Content Body */}
      <div className="space-y-8 text-gray-300 text-sm sm:text-base leading-relaxed bg-white/[0.02] border border-white/5 p-6 sm:p-10 rounded-3xl">
        {page === 'privacy' && (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">1. Introduction</h2>
              <p>
                Welcome to <strong>Lyrifi</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), accessible from{' '}
                <a href="https://lyrifi-data.vercel.app" className="text-pink-400 hover:underline">
                  https://lyrifi-data.vercel.app
                </a>. Your privacy is critically important to us. This Privacy Policy outlines the types of information we collect and record, and how we use and protect it.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">2. Information We Collect</h2>
              <p>
                Lyrifi is designed as a free, open lyrics discovery platform. We do not require you to create an account or provide personal information such as your name, phone number, or password to view songs, albums, and lyrics.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-400 text-sm">
                <li><strong>Log Files:</strong> Like most websites, Lyrifi uses log files. These include IP addresses, browser type, Internet Service Provider (ISP), referring/exit pages, and number of clicks to analyze trends and optimize performance.</li>
                <li><strong>Local Storage:</strong> We use your browser&apos;s local storage to save your playback preferences (e.g. Tamil or Tanglish view), favorite tracks, and recently viewed songs so they persist on your device.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">3. Google AdSense &amp; DoubleClick Cookies</h2>
              <p>
                Google is a third-party vendor on our site. It uses cookies, known as <strong>DART cookies</strong>, to serve ads to visitors based upon their visit to Lyrifi and other sites on the internet.
              </p>
              <p>
                Visitors may choose to decline the use of DART cookies by visiting the Google Ad and Content Network Privacy Policy at the following URL:{' '}
                <a
                  href="https://policies.google.com/technologies/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-400 hover:underline break-all"
                >
                  https://policies.google.com/technologies/ads
                </a>
              </p>
              <p>
                Third-party ad servers or ad networks use technologies like cookies, JavaScript, or Web Beacons that are used in their respective advertisements and links that appear on Lyrifi, which are sent directly to users&apos; browsers. They automatically receive your IP address when this occurs.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">4. Third-Party Privacy Policies</h2>
              <p>
                Lyrifi&apos;s Privacy Policy does not apply to other advertisers or websites. Thus, we advise you to consult the respective Privacy Policies of these third-party ad servers for more detailed information.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">5. CCPA &amp; GDPR Privacy Rights</h2>
              <p>
                Under privacy regulations including the California Consumer Privacy Act (CCPA) and General Data Protection Regulation (GDPR), users have the right to request access to, deletion of, or non-sale of personal information. If you make a request, we will respond within one month.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">6. Contact Us</h2>
              <p>
                If you have questions or require more information about our Privacy Policy, please contact us at{' '}
                <a href="mailto:support.lyrifi@gmail.com" className="text-pink-400 hover:underline">
                  support.lyrifi@gmail.com
                </a>.
              </p>
            </section>
          </>
        )}

        {page === 'terms' && (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">1. Terms of Use</h2>
              <p>
                By accessing Lyrifi, you agree to be bound by these website Terms and Conditions of Use and agree that you are responsible for the agreement with any applicable local laws.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">2. Use License</h2>
              <p>
                Lyrifi provides lyrics and music metadata for personal, non-commercial educational and entertainment purposes only. You may view and share lyrics links with friends. You agree not to scrape, redistribute, or monetize the content without proper authorization.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">3. Disclaimer</h2>
              <p>
                All song lyrics, artist images, and movie posters displayed on Lyrifi are property of their respective copyright owners, music directors, record labels, and lyricists.
              </p>
            </section>
          </>
        )}

        {page === 'about' && (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">Welcome to Lyrifi 🎵</h2>
              <p>
                Lyrifi was created by passionate Tamil music fans with one simple mission: <em>&quot;Music feels better with words.&quot;</em>
              </p>
              <p>
                We built Lyrifi to solve the common frustrations with modern lyrics websites: cluttered popups, broken layouts, inaccurate lyrics, and lack of authentic Tamil font support.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">What Makes Lyrifi Special?</h2>
              <ul className="list-disc pl-5 space-y-2 text-gray-400">
                <li><strong>20,000+ Songs &amp; 4,600+ Movies:</strong> An encyclopedic database spanning 70 years of Tamil cinema.</li>
                <li><strong>Authentic தமிழ் &amp; Tanglish:</strong> Toggle between original Tamil script and phonetically accurate English romanization.</li>
                <li><strong>Apple Music Synchronized Line Glow:</strong> Read along with line-by-line ambient backlighting, karaoke timing, and fluid typography.</li>
                <li><strong>Lightning Fast:</strong> Sub-second catalog search across 25,000 items powered by ultra-light client-side indexing.</li>
              </ul>
            </section>
          </>
        )}

        {page === 'contact' && (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">Get In Touch</h2>
              <p>
                Have a question, feedback, lyrics correction, or business inquiry? We&apos;d love to hear from you!
              </p>
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <Mail className="w-5 h-5 text-pink-400" />
                <h3 className="font-bold text-white">Email Support</h3>
                <p className="text-xs text-gray-400">For general questions &amp; corrections:</p>
                <a href="mailto:support.lyrifi@gmail.com" className="text-xs text-pink-400 hover:underline font-mono block">
                  support.lyrifi@gmail.com
                </a>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <Copyright className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white">DMCA / Copyright</h3>
                <p className="text-xs text-gray-400">For takedown notices &amp; rights inquiries:</p>
                <a href="mailto:copyright.lyrifi@gmail.com" className="text-xs text-amber-400 hover:underline font-mono block">
                  copyright.lyrifi@gmail.com
                </a>
              </div>
            </div>
          </>
        )}

        {page === 'dmca' && (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">DMCA &amp; Copyright Notice</h2>
              <p>
                Lyrifi respects the intellectual property rights of others. All lyrics, album artworks, and music video embeds are copyrighted by their respective artists, lyricists, composers, producers, and record labels.
              </p>
              <p>
                The materials displayed on Lyrifi are provided for <strong>fair use</strong>, educational, and reference purposes to promote appreciation for Tamil musical culture.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white">DMCA Takedown Procedure</h2>
              <p>
                If you are a copyright owner or authorized representative and believe that any content on Lyrifi infringes upon your copyright, please send a written notice containing:
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-gray-400 text-sm">
                <li>Identification of the copyrighted work claimed to have been infringed.</li>
                <li>The exact URL on Lyrifi where the alleged infringing material is located.</li>
                <li>Your contact information (name, email address, physical address, and telephone number).</li>
                <li>A statement that you have a good faith belief that the disputed use is not authorized by the copyright owner, its agent, or the law.</li>
                <li>A statement, made under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on behalf of the owner.</li>
              </ol>
              <p className="mt-4">
                Please direct all DMCA notices to:{' '}
                <a href="mailto:copyright.lyrifi@gmail.com" className="text-pink-400 hover:underline font-mono">
                  copyright.lyrifi@gmail.com
                </a>
                . Valid requests will be processed within 48 business hours.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
};
