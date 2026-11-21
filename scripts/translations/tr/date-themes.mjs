export const dateThemes = {
  openers: {
    friendly: [
      [
        {
          text: "Gül ve oyuna ayak uydur.",
          reply: "{name} sırıtıyor. \"Harika. Şimdiden çok güzel bir gün olmaya başladı.\""
        },
        {
          text: "\"Bu senin fikrin miydi?\"",
          reply: "\"Belki. Beğendin mi?\" Biraz gururlanmış gibi görünüyor."
        },
        {
          text: "Bir anlığına telefonuna bak.",
          reply: "{name} bekliyor, sonra seni hafifçe dürtüyor. \"Hey. Tam karşındayım bak.\""
        }
      ],
      [
        {
          text: "\"Tamam, ben varım. Geç öne bakalım.\"",
          reply: "\"Sonunda bana güvenen biri çıktı.\" {name} yola koyuluyor."
        },
        {
          text: "Bu durumla ilgili bir espri patlat.",
          reply: "{name} kıkırdıyor. \"Hiç komik değilsin.\" Ama yine de gülüyor."
        },
        {
          text: "\"Birazcık oturabilir miyiz?\"",
          reply: "\"Tabii ki.\" Yanına oturuyor, yakın ama çok da sıkışmadan."
        }
      ]
    ],
    flirty: [
      [
        {
          text: "\"Bunu sırf beni görmek için planladın, değil mi?\"",
          reply: "\"Fark etmen epey uzun sürdü.\" {name} gözlerini senden ayırmıyor."
        },
        {
          text: "Omzuna hafifçe çarp.",
          reply: "O da omzuyla karşılık veriyor, sonra omzunu seninkine yaslı bırakıyor."
        },
        {
          text: "Umurunda değilmiş gibi davran.",
          reply: "\"Tabii kesin öyledir.\" {name} her şeyi biliyormuş gibi gülümsüyor."
        }
      ],
      [
        {
          text: "Gözlerinin içine bir saniye daha uzun bak.",
          reply: "İlk önce {name} gözlerini kaçırıyor. Kulakları hafifçe kızarıyor."
        },
        {
          text: "\"Bugün çok tatlı görünüyorsun.\"",
          reply: "\"Sadece bugün mü?\" Gülümsemesini saklamaya fena halde çalışıyor."
        },
        {
          text: "Havadan sudan bahset.",
          reply: "\"Hava durumu ha. Cidden mi?\" {name} sana tatlı tatlı gülüyor."
        }
      ]
    ],
    sweet: [
      [
        {
          text: "Elini tut.",
          reply: "{name} tek kelime etmeden parmaklarını seninkilere kenetliyor."
        },
        {
          text: "\"Seninle olduğuma çok memnunum.\"",
          reply: "\"Ben de,\" diyor usulca. \"Her defasında iyi ki sen.\""
        },
        {
          text: "\"Çok fazla kalmayalım ama.\"",
          reply: "\"Şimdiden mi?\" {name} biraz hüzünleniyor, sonra başını sallıyor."
        }
      ],
      [
        {
          text: "Başını onun omzuna yasla.",
          reply: "Sanki uçup gidecekmişsin gibi kıpırdamadan öylece kalıyor."
        },
        {
          text: "\"Günün nasıl geçti, anlatsana.\"",
          reply: "{name} anlatmaya başlıyor ve bir türlü susmuyor. Bu haline bayılıyorsun."
        },
        {
          text: "Biraz sessiz kal.",
          reply: "\"Seninle sessizlik bile çok güzel,\" diyor bir süre sonra."
        }
      ]
    ]
  },
  shared: [
    {
      line: "{place} yakınlarında bir yerlerde, bir sokak müzisyeni ikinizin de bildiği bir şarkıya başlıyor.",
      choices: [
        {
          text: "Detone olarak şarkıya eşlik et.",
          reply: "{name} daha da kötü bir sesle katılıyor. Müzisyen dayanamayıp gülüyor."
        },
        {
          text: "Biraz para atıp başka bir şarkı iste.",
          reply: "\"Yavaş bir parça olsun,\" diye ekliyor {name} ve sana bakıyor."
        },
        {
          text: "Yürümeye devam et.",
          reply: "{name} sonraki on dakika boyunca o şarkıyı mırıldanıyor."
        }
      ]
    },
    {
      line: "{name} aniden acıkıyor. \"Atıştırmalık. Hemen. Çok acil.\"",
      choices: [
        {
          text: "Elindeki son lokmayı onunla paylaş.",
          reply: "\"Sen benim kahramanımsın.\" Tek bir ısırıkta bitiriyor."
        },
        {
          text: "En yakın tezgaha kadar onunla yarış.",
          reply: "Sen kazanıyorsun. {name} bilerek izin verdiğini iddia ediyor. Tabii ki izin vermedi."
        },
        {
          text: "\"Daha yeni yedin ya.\"",
          reply: "\"Bir saat oldu ama.\" Sanki ona ihanet etmişsin gibi bakıyor."
        }
      ]
    },
    {
      line: "{place} mekanında çiselemeye başlıyor. İkinizin de şemsiyesi yok.",
      choices: [
        {
          text: "Bir ceketi ikinizin başının üzerine tut.",
          reply: "Birbirinize çok yaklaşıyorsunuz. İkiniz de hiç şikayetçi değilsiniz."
        },
        {
          text: "Birlikte sığınacak bir yere koşun.",
          reply: "{name} kayıp düşmeyesin diye elini sıkıca tutuyor."
        },
        {
          text: "Yağmurun altında dur. Sonuçta sadece yağmur.",
          reply: "\"Çok garip birisin,\" diyor {name} ve seninle kalmaya devam ediyor."
        }
      ]
    },
    {
      line: "{name} {place} mekanında bir fotoğraf çekilmek istiyor. \"Anı kalsın,\" diyor.",
      choices: [
        {
          text: "Komik bir yüz ifadesi yap.",
          reply: "O kadar çok gülüyor ki fotoğraf bulanık çıkıyor. Yine de silmiyor."
        },
        {
          text: "Bu seferlik düzgünce gülümse.",
          reply: "\"Vay be. Bunu çerçeveletmeliyiz.\" {name} fotoğrafı iki kez kaydediyor."
        },
        {
          text: "\"Fotoğraflardan nefret ederim.\"",
          reply: "\"Bir tane ya. Sadece bir tanecik.\" Bir tane çekmesine izin veriyorsun."
        }
      ]
    },
    {
      line: "{place} yakınlarında küçük bir çocuk ikinizin sevgili olup olmadığını soruyor.",
      choices: [
        {
          text: "\"Ona sor bakalım.\"",
          reply: "{name} kekeleyerek bir şeyler geveliyor. Çocuk durumdan çok memnun."
        },
        {
          text: "\"En yakın arkadaşız. Şimdilik.\"",
          reply: "{name} \"şimdilik\" lafını duyunca tek kaşını kaldırıyor."
        },
        {
          text: "\"Yok artık, asla!\"",
          reply: "\"Vay be. Öyle olsun.\" {name} kırılmış gibi yapıyor. Çoğunlukla numara tabii."
        }
      ]
    },
    {
      line: "{place} mekanında sakin bir bank buluyorsunuz. {name} ne düşündüğünü soruyor.",
      choices: [
        {
          text: "\"Açıkçası seni.\"",
          reply: "Gözlerini kaçırıyor ve kendi kendine gülümsüyor."
        },
        {
          text: "\"Bugünün ne kadar güzel geçtiğini.\"",
          reply: "\"Gerçekten öyle,\" diyerek katılıyor {name}. \"Bunu daha sık yapalım.\""
        },
        {
          text: "\"Akşam yemeğini.\"",
          reply: "\"Çok haklısın. Hem de çok.\" {name} de artık akşam yemeğini düşünmeye başlıyor."
        }
      ]
    }
  ],
  moodRounds: {
    friendly: [
      {
        line: "{name} seninle bir oyuna giriyor: {place} mekanında ilk gülen içecekleri ısmarlar.",
        choices: [
          {
            text: "En komik yüzünü yap.",
            reply: "{name} iki saniye bile dayanamıyor. \"Haksızlık bu! Resmen kural dışı vurdun.\""
          },
          {
            text: "En berbat şakanı yap.",
            reply: "Önce inliyor, sonra dayanamayıp gülüyor. \"Güldüğüme inanamıyorum.\""
          },
          {
            text: "Bilerek ilk önce sen gül.",
            reply: "\"Bilerek mi yenildin sen az önce?\" Yine de sana içeceğini ısmarlıyor."
          }
        ]
      },
      {
        line: "{name} sana hayatındaki en kötü günün hikayesini anlatıyor, ve hikaye inanılmaz komik.",
        choices: [
          {
            text: "Sen de kendi kötü gününü anlat.",
            reply: "\"Yok artık. Seninki açık ara kazandı.\" Gözlerindeki yaşları siliyor."
          },
          {
            text: "Nefesin kesilene kadar gül.",
            reply: "\"O kadar da komik değildi ama.\" Kesinlikle öyleydi."
          },
          {
            text: "\"Kulağa berbat geliyor.\"",
            reply: "\"Öyleydi zaten. Ama şimdi düşününce çok komik.\" Omuz silkip gülümsüyor."
          }
        ]
      }
    ],
    flirty: [
      {
        line: "{name} yanağındaki bir şeyi usulca alıyor. \"Kirpik. Bir dilek tut.\"",
        choices: [
          {
            text: "\"Dileğim çoktan gerçekleşti bile.\"",
            reply: "{name} buna söyleyecek tek bir kelime bile bulamıyor. İlk defa."
          },
          {
            text: "Kirpiği ona doğru üfle.",
            reply: "\"Az önce benim için mi dilek tuttun?\" Yüzünde muzip bir gülümseme var."
          },
          {
            text: "\"Ben dileklere inanmam.\"",
            reply: "\"O zaman senin yerine ben tutarım,\" diyor ve gözlerini kapatıyor."
          }
        ]
      },
      {
        line: "{name} sormadan içeceğinden bir yudum alıyor. \"Benimkinden daha güzelmiş.\"",
        choices: [
          {
            text: "Sen de onun içeceğini kap.",
            reply: "\"Hey!\" Küçük bir savaş başlıyor. Kazanan yok. Herkes gülüyor."
          },
          {
            text: "\"Bu dolaylı öpücük sayılır, biliyorsun değil mi?\"",
            reply: "{name} hafifçe öksürüyor. \"Sayılmaz bir kere.\" Yüzü kıpkırmızı."
          },
          {
            text: "\"Kendine alsana.\"",
            reply: "\"Tamam be.\" Gidip iki tane alıyor ve birini sana veriyor."
          }
        ]
      }
    ],
    sweet: [
      {
        line: "{name} saçını kulağının arkasına sıkıştırıyor. \"Kusura bakma. Gözünün önüne geliyordu.\"",
        choices: [
          {
            text: "\"Kusura bakılacak bir şey yok.\"",
            reply: "Eli olması gerekenden bir saniye daha uzun süre saçında kalıyor."
          },
          {
            text: "Sen de aynısını onun için yap.",
            reply: "{name} sessizce gülüyor. \"Çok şapşalız gerçekten.\""
          },
          {
            text: "\"Kendim de yapabilirdim.\"",
            reply: "\"Biliyorum,\" diyor. \"Ben yapmak istedim.\""
          }
        ]
      },
      {
        line: "{place} mekanında, {name} şöyle diyor: \"Sana bir şey söyleyebilir miyim? Birlikte geçirdiğimiz günleri çok düşünüyorum.\"",
        choices: [
          {
            text: "\"Ben de. Sürekli hem de.\"",
            reply: "{name} derin bir nefes veriyor, sanki çok gerginmiş gibi."
          },
          {
            text: "\"En çok hangisini sevdin?\"",
            reply: "\"Bunu,\" diyor hiç düşünmeden."
          },
          {
            text: "\"Neden?\"",
            reply: "\"Çünkü seninle geçiyor.\" Son derece sade bir şekilde söylüyor bunu."
          }
        ]
      }
    ]
  },
  closers: {
    friendly: [
      {
        line: "{place} mekanında vakit iyice ilerliyor. {name} geriniyor. \"Gelecek hafta aynı saatte?\"",
        choices: [
          {
            text: "\"Anlaştık. Bir dahaki sefere sen seçiyorsun.\"",
            reply: "\"Tehlikeli karar. Aklımda harika fikirler var.\" Şimdiden plan yapmaya başladı bile."
          },
          {
            text: "Ona beşlik çak.",
            reply: "Bilerek ıskalıyor ve onun yerine sana sarılıyor."
          },
          {
            text: "\"Belki.\"",
            reply: "\"Belkiyi kabul ediyorum.\" {name} arkandan uzun uzun el sallıyor."
          }
        ]
      },
      {
        line: "Eve dönüş yolunda {name} şöyle diyor: \"Çok güzel bir gündü. Bugün için teşekkür ederim.\"",
        choices: [
          {
            text: "\"Asıl BEN teşekkür ederim.\"",
            reply: "\"İkimiz de pek bir kibarız.\" Hafifçe koluna çarpıyor."
          },
          {
            text: "Onu kapısına kadar bırak.",
            reply: "\"Hiç gerek yoktu aslında.\" Ama bıraktığına çok seviniyor."
          },
          {
            text: "\"Fena değildi işte.\"",
            reply: "\"Sadece fena değil mi? Bir sonrakine gör sen.\" Sesi çok kararlı geliyor."
          }
        ]
      }
    ],
    flirty: [
      {
        line: "{place} mekanından ayrılırken {name} adımlarını yavaşlatıyor. \"Henüz pek gidesim yok aslında.\"",
        choices: [
          {
            text: "\"O zaman beni eve bırak. Yolu en uzundan alarak.\"",
            reply: "Olabilecek en uzun yoldan götürüyor."
          },
          {
            text: "\"Benim de hiç yok.\"",
            reply: "{name} yere bakıp gülümsüyor. \"Çok sevindim.\""
          },
          {
            text: "\"Yakında görüşürüz o zaman.\"",
            reply: "\"Yakında,\" diye tekrar ediyor, bir söz verir gibi."
          }
        ]
      },
      {
        line: "Köşe başında {name} şöyle diyor: \"Eve varınca mesaj at. Aklım sende kalmasın.\"",
        choices: [
          {
            text: "\"Sadece ilk sen atarsan atarım.\"",
            reply: "Daha köşeyi bile dönmeden telefonun titriyor."
          },
          {
            text: "Göz kırp ve yürümeye devam et.",
            reply: "Arkandan güldüğünü duyuyorsun."
          },
          {
            text: "\"Tamam.\"",
            reply: "\"Tamam,\" diye yankılıyor ve sen gözden kaybolana kadar bekliyor."
          }
        ]
      }
    ],
    sweet: [
      {
        line: "Günün sonunda, {place} mekanında {name} seni uzun uzun kucaklıyor.",
        choices: [
          {
            text: "Biraz daha uzun sarıl.",
            reply: "\"Bir dakika daha böyle kalalım,\" diye fısıldıyor."
          },
          {
            text: "\"Bugün için teşekkür ederim.\"",
            reply: "\"Her gün için ben teşekkür ederim,\" diyor {name}."
          },
          {
            text: "Sırtını hafifçe sıvazla.",
            reply: "Omzuna doğru gülüyor. \"Bu resmen 'yeter artık' patpatıydı.\""
          }
        ]
      },
      {
        line: "{name} uzun bir süre gözlerinin içine bakıyor. \"Bugünü baştan sona tekrar yaşamak isterdim. Her anını.\"",
        choices: [
          {
            text: "\"O zaman tekrar yaşayalım.\"",
            reply: "Elini sıkıyor. \"Yarın o zaman.\""
          },
          {
            text: "Yanağından öp.",
            reply: "{name} önce sessizleşiyor, sonra eve gidene kadar yüzünden tebessüm eksik olmuyor."
          },
          {
            text: "\"Yağmuru bile mi?\"",
            reply: "\"Özellikle de yağmuru.\""
          }
        ]
      }
    ]
  }
};
