import Link from 'next/link'

const GOLD = '#C9A84C'
const GOLD_LIGHT = '#F5EDD6'
const DARK = '#1A1A1A'
const MID = '#555'
const FAINT = '#888'
const BORDER = '#E5E0D8'
const CARD = '#FFFFFF'
const BG = '#F7F4F0'
const BG2 = '#FFFFFF'

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{fontFamily:'Inter,system-ui,sans-serif',background:BG,color:DARK}}>

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-[60px] flex items-center px-8" style={{background:'rgba(247,244,240,0.95)',borderBottom:`1px solid ${BORDER}`,backdropFilter:'blur(8px)'}}>
        <div className="max-w-5xl mx-auto w-full flex items-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{background:GOLD}}>🎁</div>
            <span className="font-black tracking-tight text-[15px]" style={{color:DARK}}>GiftIt</span>
          </div>
          <div className="hidden md:flex gap-7 ml-10">
            {['How it works','Gift Modes','Occasions','Pricing'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g,'')}`} className="text-[13px] font-medium transition-colors" style={{color:FAINT}}>{l}</a>
            ))}
          </div>
          <div className="ml-auto flex gap-2 items-center">
            <Link href="/login" className="text-[13px] font-semibold px-4 py-2 rounded-lg transition-colors" style={{color:MID,border:`1px solid ${BORDER}`}}>Log in</Link>
            <Link href="/signup" className="text-[13px] font-semibold px-4 py-2 rounded-lg text-white" style={{background:GOLD}}>Get Early Access</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-[60px] pb-24">
        <div className="max-w-5xl mx-auto px-8 pt-20">
          <div className="grid md:grid-cols-[1fr_360px] gap-16 items-start">
            <div>
              <div className="inline-block mb-6 text-[11px] font-bold uppercase tracking-[0.1em] px-3 py-1 rounded-full" style={{background:GOLD_LIGHT,color:GOLD}}>
                India&apos;s gifting platform
              </div>
              <h1 className="text-5xl md:text-[56px] font-black tracking-tight leading-[1.06] mb-5" style={{color:DARK}}>
                Gift money.<br /><span style={{color:GOLD}}>Shop freely.</span><br />No guessing.
              </h1>
              <p className="text-[17px] leading-[1.8] mb-9 max-w-[440px]" style={{color:MID}}>
                Contribute any amount for any occasion. Recipients build a wallet and spend it across 300+ Indian brands — their choice, their timing.
              </p>
              <div className="flex gap-3 mb-14 flex-wrap">
                <Link href="/signup" className="px-6 py-3 text-white font-bold rounded-lg text-[15px]" style={{background:GOLD}}>
                  Join the Waitlist →
                </Link>
                <a href="#howitworks" className="px-6 py-3 font-semibold rounded-lg text-[15px]" style={{color:MID,border:`1px solid ${BORDER}`,background:CARD}}>
                  See how it works
                </a>
              </div>
              <div className="flex gap-0">
                {[['300+','Partner brands'],['4','Gift modes'],['₹0','Cost to gifter']].map(([n,l],i) => (
                  <div key={l} className={`${i > 0 ? 'pl-8' : ''} ${i < 2 ? 'pr-8' : ''}`} style={i > 0 ? {borderLeft:`1px solid ${BORDER}`} : {}}>
                    <div className="text-2xl font-black tracking-tight" style={{color:DARK}}>{n}</div>
                    <div className="text-[11px] mt-0.5 font-medium" style={{color:FAINT}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* App card mockup */}
            <div className="rounded-2xl overflow-hidden shadow-sm" style={{background:CARD,border:`1px solid ${BORDER}`}}>
              <div className="flex items-center gap-1.5 px-4 py-3" style={{background:'#F0EDE8',borderBottom:`1px solid ${BORDER}`}}>
                <div className="w-2.5 h-2.5 rounded-full" style={{background:'#FF5F57'}}/>
                <div className="w-2.5 h-2.5 rounded-full" style={{background:'#FFBD2E'}}/>
                <div className="w-2.5 h-2.5 rounded-full" style={{background:'#28C840'}}/>
                <span className="ml-2 text-[11px]" style={{color:FAINT}}>GiftIt — Birthday Pool</span>
              </div>
              <div className="p-6">
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{color:GOLD}}>🎂 Birthday · Dec 15</div>
                <div className="text-[16px] font-bold mb-5" style={{color:DARK}}>Priya&apos;s Birthday</div>
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{color:FAINT}}>Gift Pool</div>
                <div className="text-4xl font-black tracking-tight mb-3" style={{color:DARK}}>₹18,400</div>
                <div className="h-1.5 rounded-full mb-2" style={{background:'#EDE8E0'}}>
                  <div className="h-1.5 rounded-full w-3/4" style={{background:GOLD}}/>
                </div>
                <div className="flex justify-between text-[10px] mb-5" style={{color:FAINT}}>
                  <span>12 friends gifted</span><span>Goal ₹25,000</span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{color:FAINT}}>Recent gifts</div>
                {[
                  ['R','Rahul Sharma','"Happy Birthday! 🎉"','₹2,000','#C9A84C'],
                  ['A','Anjali Mehta','"Spend it well!"','₹1,500','#B8963E'],
                  ['V','Vikram Nair','"🎂🎁"','₹500','#A07830']
                ].map(([av,name,msg,amt,bg]) => (
                  <div key={name} className="flex items-center gap-3 py-2.5" style={{borderTop:`1px solid ${BORDER}`}}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{background:bg}}>{av}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold" style={{color:DARK}}>{name}</div>
                      <div className="text-[10px]" style={{color:FAINT}}>{msg}</div>
                    </div>
                    <div className="text-[12px] font-bold" style={{color:GOLD}}>{amt}</div>
                  </div>
                ))}
                <Link href="/signup" className="block w-full mt-4 py-3 text-white font-bold rounded-lg text-[13px] text-center" style={{background:GOLD}}>Gift via UPI →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <div style={{borderTop:`1px solid ${BORDER}`,borderBottom:`1px solid ${BORDER}`,background:BG2}}>
        <div className="max-w-5xl mx-auto px-8 py-4 flex flex-wrap justify-center gap-8">
          {[['🔒','Razorpay-powered payments'],['🏪','300+ brands via Pine Labs'],['⚡','On-demand vouchers'],['🇮🇳','UPI · Cards · Netbanking']].map(([ico,txt]) => (
            <div key={txt} className="flex items-center gap-2">
              <span className="text-[15px]" style={{opacity:0.5}}>{ico}</span>
              <span className="text-[13px] font-medium" style={{color:MID}}>{txt}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PROBLEM */}
      <section className="py-24" style={{borderBottom:`1px solid ${BORDER}`}}>
        <div className="max-w-5xl mx-auto px-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] mb-4" style={{color:GOLD}}>The problem</div>
          <h2 className="text-4xl font-black tracking-tight mb-4" style={{color:DARK}}>Gift-giving in India<br />hasn&apos;t been solved.</h2>
          <p className="text-[15px] mb-14 max-w-xl" style={{color:MID}}>Every celebration ends in duplicate gifts, wasted money, and recipients pretending to love things they didn&apos;t want.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              ['01','No idea what to buy','Hours of browsing ends in a random pick. Half the time it\'s wrong.'],
              ['02','Everyone gifts the same thing','Five diaper bags. Four bedsheet sets. The recipient uses none.'],
              ['03','Cash feels impersonal','A bare UPI transfer has no warmth. Feels like settling a bill.'],
              ['04','Group gifting is chaos','Chasing 15 people on WhatsApp to collect money and decide what to buy.'],
              ['05','Shipping and logistics','Wrong address, not home, lost package. More stress than it\'s worth.'],
              ['06','Can\'t gift spontaneously','No event? No easy way to send something meaningful right now.']
            ].map(([n,h,p]) => (
              <div key={n} className="rounded-xl p-7" style={{background:CARD,border:`1px solid ${BORDER}`}}>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-5" style={{color:'#CCC'}}>{n}</div>
                <h3 className="text-[14px] font-bold mb-2" style={{color:DARK}}>{h}</h3>
                <p className="text-[13px] leading-relaxed" style={{color:FAINT}}>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="howitworks" className="py-24" style={{background:BG2,borderBottom:`1px solid ${BORDER}`}}>
        <div className="max-w-5xl mx-auto px-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] mb-4" style={{color:GOLD}}>How it works</div>
          <h2 className="text-4xl font-black tracking-tight mb-4" style={{color:DARK}}>Simple for everyone.</h2>
          <p className="text-[15px] mb-12 max-w-xl" style={{color:MID}}>Whether you&apos;re gifting or receiving — the experience takes under two minutes.</p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              ['Step 01','🔗','Open the event link','Someone shares a GiftIt link via WhatsApp. Open in any browser — no app required.'],
              ['Step 02','💳','Choose your amount','₹100 to ₹10,000 — your call. Pay via UPI, card, or netbanking in under a minute.'],
              ['Step 03','🎉','Recipient shops freely','Gift pool accumulates. Recipient redeems brand vouchers when ready — their choice.']
            ].map(([s,ico,h,p]) => (
              <div key={s} className="rounded-xl p-7" style={{background:BG,border:`1px solid ${BORDER}`}}>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-5" style={{color:GOLD}}>{s}</div>
                <div className="text-2xl mb-3">{ico}</div>
                <h3 className="text-[14px] font-bold mb-2" style={{color:DARK}}>{h}</h3>
                <p className="text-[13px] leading-relaxed" style={{color:FAINT}}>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GIFT MODES */}
      <section id="giftmodes" className="py-24" style={{borderBottom:`1px solid ${BORDER}`}}>
        <div className="max-w-5xl mx-auto px-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] mb-4" style={{color:GOLD}}>Gift modes</div>
          <h2 className="text-4xl font-black tracking-tight mb-4" style={{color:DARK}}>Four ways to give.</h2>
          <p className="text-[15px] mb-12" style={{color:MID}}>Every occasion, every relationship — GiftIt has a mode for it.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['⚡','P2P Gift','Directly to anyone, anytime. No event needed.','Instant'],
              ['🎂','Self Event','Create your own birthday or wishlist event.','You create it'],
              ['👥','Organiser Event','A friend creates it for you. Pool is locked to you.','Friend creates it'],
              ['🤫','Surprise Event','Hidden from recipient until the big reveal.','Secret reveal']
            ].map(([ico,h,p,tag]) => (
              <div key={h} className="rounded-xl p-6" style={{background:CARD,border:`1px solid ${BORDER}`}}>
                <div className="text-2xl mb-4">{ico}</div>
                <h3 className="text-[14px] font-bold mb-2" style={{color:DARK}}>{h}</h3>
                <p className="text-[12px] leading-relaxed mb-4" style={{color:FAINT}}>{p}</p>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{color:GOLD}}>{tag} →</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GIFT ID */}
      <section id="giftid" className="py-24" style={{background:BG2,borderBottom:`1px solid ${BORDER}`}}>
        <div className="max-w-5xl mx-auto px-8 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.1em] mb-4" style={{color:GOLD}}>GiftID</div>
            <h2 className="text-4xl font-black tracking-tight mb-4" style={{color:DARK}}>Your gifting<br />identity.</h2>
            <p className="text-[15px] leading-relaxed mb-4" style={{color:MID}}>Every user gets a unique GiftID — a handle like <span style={{color:GOLD}}>@priya</span> plus a code like <span style={{color:GOLD}}>GIFT-4821-3390</span>. Share it and anyone can gift you directly, even without an event.</p>
            <p className="text-[15px] leading-relaxed" style={{color:MID}}>P2P gifting works by phone number or name search too — no one needs to memorise IDs.</p>
          </div>
          <div className="rounded-2xl p-8 shadow-sm" style={{background:BG,border:`1px solid ${BORDER}`}}>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{color:FAINT}}>Your GiftID</div>
            <div className="text-3xl font-black mb-1" style={{color:DARK}}>@priya</div>
            <div className="text-[13px] font-mono mb-6" style={{color:FAINT}}>GIFT-4821-3390</div>
            <div className="h-px mb-6" style={{background:BORDER}}/>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{color:FAINT}}>Gift Wallet</div>
            <div className="text-4xl font-black mb-1" style={{color:DARK}}>₹18,400</div>
            <div className="text-[12px] mb-6" style={{color:FAINT}}>Available to redeem</div>
            <button className="w-full py-3 text-white font-bold rounded-lg text-[13px]" style={{background:GOLD}}>Redeem at a Brand →</button>
          </div>
        </div>
      </section>

      {/* OCCASIONS */}
      <section id="occasions" className="py-24" style={{borderBottom:`1px solid ${BORDER}`}}>
        <div className="max-w-5xl mx-auto px-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] mb-4" style={{color:GOLD}}>Occasions</div>
          <h2 className="text-4xl font-black tracking-tight mb-12" style={{color:DARK}}>Every celebration covered.</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['🎂','Birthday','Let them buy what they actually want'],
              ['👶','Baby Shower','New parents choose what they need'],
              ['🏠','Housewarming','Fund the sofa, not the 8th photo frame'],
              ['💍','Wedding','Honeymoon fund or dream home items'],
              ['🎓','Graduation','Start the next chapter right'],
              ['💕','Anniversary','Experiences or luxury — their pick'],
              ['🪔','Festivals','Diwali, Eid, Christmas and more'],
              ['✨','Any Occasion','Create a custom event anytime']
            ].map(([ico,h,p]) => (
              <div key={h} className="rounded-xl p-5" style={{background:CARD,border:`1px solid ${BORDER}`}}>
                <div className="text-2xl mb-3">{ico}</div>
                <div className="text-[13px] font-bold mb-1" style={{color:DARK}}>{h}</div>
                <div className="text-[11px]" style={{color:FAINT}}>{p}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24" style={{background:BG2,borderBottom:`1px solid ${BORDER}`}}>
        <div className="max-w-5xl mx-auto px-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] mb-4" style={{color:GOLD}}>Pricing</div>
          <h2 className="text-4xl font-black tracking-tight mb-4" style={{color:DARK}}>Simple, transparent fees.</h2>
          <p className="text-[15px] mb-12" style={{color:MID}}>Gifting is always free. A small fee on redemption keeps GiftIt running.</p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                for:'For Gifters',price:'₹0',unit:'per gift',
                desc:'Gifting costs nothing. You only pay what you choose to give.',
                feats:['Gift from ₹100','UPI, card, netbanking','Personal message','Instant receipt','No account needed'],
                featured:false
              },
              {
                for:'For Recipients',price:'2%',unit:'on redemption',
                desc:'Only charged when you convert wallet balance to a brand voucher.',
                feats:['Unlimited events','P2P gifting','300+ partner brands','On-demand vouchers','Full dashboard'],
                featured:true
              },
              {
                for:'For Retailers',price:'Custom',unit:'partnership',
                desc:'Reach high-intent shoppers ready to spend gift money.',
                feats:['Affiliate commission','Featured placement','Voucher API integration','Co-marketing','Analytics'],
                featured:false
              },
            ].map(c => (
              <div key={c.for} className="rounded-xl p-7 relative" style={{background:BG,border:c.featured ? `2px solid ${GOLD}` : `1px solid ${BORDER}`}}>
                {c.featured && <div className="absolute -top-3 left-5 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider" style={{background:GOLD}}>Most popular</div>}
                <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{color:FAINT}}>{c.for}</div>
                <div className="text-3xl font-black tracking-tight mb-1" style={{color:DARK}}>{c.price} <span className="text-[13px] font-normal" style={{color:FAINT}}>{c.unit}</span></div>
                <p className="text-[12px] mb-5 pb-5" style={{color:FAINT,borderBottom:`1px solid ${BORDER}`}}>{c.desc}</p>
                <ul className="space-y-2.5">
                  {c.feats.map(f => <li key={f} className="text-[12px] flex gap-2" style={{color:MID}}><span style={{color:GOLD}} className="font-bold">✓</span>{f}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28" style={{background:BG}}>
        <div className="max-w-lg mx-auto px-8 text-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] mb-4" style={{color:GOLD}}>Early access</div>
          <h2 className="text-4xl font-black tracking-tight mb-4" style={{color:DARK}}>Ready to GiftIt?</h2>
          <p className="text-[15px] mb-8 leading-relaxed" style={{color:MID}}>Launching in India soon. Early users get zero platform fees on their first three events.</p>
          <div className="flex gap-2 mb-3">
            <input type="email" placeholder="your@email.com" className="flex-1 rounded-lg px-4 py-3 text-[14px] outline-none" style={{background:CARD,border:`1px solid ${BORDER}`,color:DARK}} />
            <Link href="/signup" className="px-5 py-3 text-white font-bold rounded-lg text-[14px] whitespace-nowrap" style={{background:GOLD}}>Join Waitlist →</Link>
          </div>
          <p className="text-[11px]" style={{color:'#AAA'}}>No spam. Unsubscribe anytime.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10" style={{borderTop:`1px solid ${BORDER}`,background:BG2}}>
        <div className="max-w-5xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs" style={{background:GOLD}}>🎁</div>
            <span className="font-black tracking-tight text-sm" style={{color:DARK}}>GiftIt</span>
          </div>
          <div className="text-[12px]" style={{color:'#AAA'}}>© 2025 GiftIt Technologies Pvt. Ltd. · Made in India 🇮🇳</div>
          <div className="flex gap-5">
            {['Privacy','Terms','Contact'].map(l => <a key={l} href="#" className="text-[12px]" style={{color:'#AAA'}}>{l}</a>)}
          </div>
        </div>
      </footer>

    </div>
  )
}
