export const worlds = {
  seaside: {
    intro: "Seaside usulü küçük bir test! Kampüsümüz hakkında beş soru. Dördünü doğru bil, Seaside çerçevesi senin olsun.",
    right: [
      "Doğru! Derste iyi dinlemişsin.",
      "Evet! Bütün kampüsten sana koca bir altın yıldız.",
      "Harika. Gizliden gizliye burada öğrenci misin yoksa?"
    ],
    wrong: [
      "Pek sayılmaz. Doğru cevap {answer}. Artık öğrenmiş oldun.",
      "Çok yaklaştın! Doğru cevap {answer}. Avludakilere bir sor bakalım.",
      "Maalesef, {answer}. Üzülme, zaten kimse kampüs gazetesini okumuyor."
    ],
    match: [
      "Aynısı! Kutlamak için iskeleye kadar yarışalım mı?",
      "Aynı şekilde düşünüyoruz. Bu biraz korkutucu derecede iyi.",
      "Biliyordum. Ömür boyu çalışma arkadaşı olacağız."
    ],
    differ: [
      "Ben {answer} seçtim. Eve yürürken bunun üzerine tartışalım.",
      "Hmm, ben {answer} dedim. Bir şeyler atıştırırken bana nedenini açıkla bakalım.",
      "Benimki {answer}. Zıt kutuplar harika laboratuvar arkadaşı olur."
    ],
    frame: {
      caption: "yüzme dersinden sonra"
    },
    selfQuiz: [
      {
        text: "Ne için derse girmemezlik yapardım?",
        options: [
          "Gün doğumunda yüzmek için",
          "Senin için",
          "Bedava yemek için",
          "Asla, ben örnek bir öğrenciyim"
        ]
      },
      {
        text: "Kampüsteki favori köşem?",
        options: [
          "İskele",
          "Kütüphane çatısı",
          "Otomatın önü",
          "Sen neredeysen orası"
        ]
      },
      {
        text: "Çantamda her zaman ne bulunur?",
        options: [
          "Fazladan bir atıştırmalık",
          "Hiçbiri yazmayan üç tükenmez kalem",
          "Islak bir havlu",
          "Senin ders notların"
        ]
      },
      {
        text: "Sınavlara nasıl çalışırım?",
        options: [
          "Panik içinde sabaha kadar",
          "Erkenden ve düzenli",
          "Seninle, dikkatim dağılarak",
          "Çalışmam, doğaçlama girerim"
        ]
      },
      {
        text: "Mükemmel bir hafta sonu hayalim?",
        options: [
          "Bütün gün kumsalda",
          "Öğlene kadar uyumak",
          "Film maratonu",
          "Seninle bir seyahat"
        ]
      },
      {
        text: "Stresli olduğumda ne yaparım?",
        options: [
          "Yüzüp kafamı dağıtırım",
          "Sessizleşirim",
          "Tatlı bir şeyler yerim",
          "Sana mesaj atarım"
        ]
      },
      {
        text: "Kampüsteki lakabım?",
        options: [
          "Tatlı bela",
          "Sessiz çocuk",
          "Kaptan",
          "Söylemem"
        ]
      }
    ],
    quiz: [
      {
        text: "Kampüs kedilerini gizlice kim besliyor?",
        options: [
          "Elio",
          "Kai",
          "Rowan",
          "Theo"
        ]
      },
      {
        text: "Hana hangi kulübü yönetiyor?",
        options: [
          "Sinema kulübü",
          "Sanat kulübü",
          "Münazara takımı",
          "Yüzme takımı"
        ]
      },
      {
        text: "Akvaryum laboratuvarındaki her balığa bir arkadaşının adını kim koyuyor?",
        options: [
          "Felix",
          "Jun",
          "Rowan",
          "Iris"
        ]
      },
      {
        text: "Noah’nın kampüs radyo programı ne zaman yayına giriyor?",
        options: [
          "Sabah 07:00",
          "Öğlen 12:00",
          "Akşam 18:00",
          "Gece 01:00"
        ]
      },
      {
        text: "Öğrenci birliği başkanı olarak hiçbir tartışmayı kaybetmeyen kim?",
        options: [
          "Tessa",
          "Theo",
          "Kai",
          "Hana"
        ]
      },
      {
        text: "Kai derslerde senin için yanında ne getirir?",
        options: [
          "Kahve",
          "Ders notu",
          "Fazladan bir atıştırmalık",
          "Havlu"
        ]
      },
      {
        text: "Nasıl hissettiğine tam uyacak o kitaba her zaman sahip olan kim?",
        options: [
          "Iris",
          "Elio",
          "Noah",
          "Jun"
        ]
      },
      {
        text: "Felix yanında eski bir ne taşır?",
        options: [
          "Gitar",
          "Film kamerası",
          "Harita",
          "Radyo"
        ]
      }
    ],
    dateRounds: [
      {
        line: "Kampüste bir yerlerde ders zili çalıyor. {name} gülümsüyor. \"Şu an ikimizin de derste olması gerekiyordu.\"",
        choices: [
          {
            text: "\"O zaman birlikte geç kalalım.\"",
            reply: "\"Tüm hafta boyunca aklına gelen en iyi fikir.\" Elini tutuyor ve koşmaya başlıyor."
          },
          {
            text: "\"Bir derse girelim, sonra gideriz.\"",
            reply: "\"Sorumlu. Sinir bozucu. Ama tamam.\" Dışarıda seni bekliyor."
          },
          {
            text: "Derse tek başına git.",
            reply: "{name} önce surat asıyor, sonra denizin fotoğrafını atıyor. \"Bunu kaçırıyorsun bak.\""
          }
        ]
      },
      {
        line: "Deniz tam şurada, {place} kıyısında. {name} ayakkabılarını çoktan çıkarmaya başladı bile.",
        choices: [
          {
            text: "Onunla suya doğru yarış.",
            reply: "İkiniz de kaybediyorsunuz. İkiniz de kazanıyorsunuz. Kot pantolonun sırılsıklam."
          },
          {
            text: "Ayak parmaklarını dikkatlice suya sok.",
            reply: "\"Çok cesursun,\" diye takılıyor {name} ve yine de üstüne su sıçratıyor."
          },
          {
            text: "Ayakkabıların başında nöbet tut.",
            reply: "\"Ayakkabı muhafızı. Çok asil bir görev.\" Sudan sırılsıklam geri dönüyor."
          }
        ]
      }
    ]
  },
  moonlit: {
    intro: "Ey gezgin. Diyar, çerçevesini taşımak isteyenlere beş soru sorar. Dördüne dürüstçe cevap ver ve çerçeve senin olsun.",
    right: [
      "Doğru. Yıldızlar seni onaylıyor.",
      "Doğru bildin. Senden harika bir şövalye olurdu.",
      "Evet. Diyar artık seni hatırlıyor."
    ],
    wrong: [
      "Hayır gezgin. Doğru cevap {answer}. Bunu unutma.",
      "Öyle değil. Cevap {answer}. Arşiv asla yalan söylemez.",
      "Yanlış yol. Cevap {answer}. Ay ışığında bir kez daha dene."
    ],
    match: [
      "Aynı tercihi yaptık. Bu bir işaret, hem de çok güzel bir işaret.",
      "Cevaplarımız birbiriyle hizalandı, tıpkı iki yıldız gibi.",
      "Tahmin ettiğim gibi. Sen ve ben aynı geceden yapılmışız."
    ],
    differ: [
      "Ben {answer} seçtim. Ateşin başında bana nedenini anlatsana.",
      "Benim cevabım {answer} oldu. Farklı bir yol ama yanlış bir yol değil.",
      "Benim için {answer}. Diyarın ikimize de ihtiyacı var."
    ],
    frame: {
      caption: "eski yıldızların altında"
    },
    selfQuiz: [
      {
        text: "En çok neyi korurum?",
        options: [
          "Kılıcımı",
          "Eski bir sözü",
          "Seni",
          "Gururumu"
        ]
      },
      {
        text: "Düşünmek için nereye giderim?",
        options: [
          "Kulenin çatısına",
          "Ay bahçesine",
          "Ormanın kıyısına",
          "Sen neredeysen oraya"
        ]
      },
      {
        text: "En çok neden korkarım?",
        options: [
          "Hiçbir şeyden",
          "Unutulmaktan",
          "Seni kaybetmekten",
          "Örümceklerden. Gülme sakın"
        ]
      },
      {
        text: "Yeminim kime aittir?",
        options: [
          "Krala",
          "Yıldızlara",
          "Kendime",
          "Artık sana"
        ]
      },
      {
        text: "Unvanımı neyin karşılığında takas ederdim?",
        options: [
          "Hiçbir şeyin",
          "Huzurun",
          "Seninle sessiz bir gecenin",
          "Sıcak bir ekmeğin"
        ]
      },
      {
        text: "Nasıl özür dilerim?",
        options: [
          "Dilemem",
          "Bir hediyeyle",
          "Uzun bir mektupla",
          "Beceriksizce ama denerim"
        ]
      },
      {
        text: "En sevdiğim saat?",
        options: [
          "Gün doğumu",
          "Gece yarısı",
          "Savaştan önceki o saat",
          "Senin uyanık olduğun herhangi bir saat"
        ]
      }
    ],
    quiz: [
      {
        text: "Yıldız arşivini kim koruyor?",
        options: [
          "Lord Castor",
          "Prens Aurelian",
          "Vesper",
          "Kael"
        ]
      },
      {
        text: "Prens Aurelian’ın bahçesi yalnızca ne zaman çiçek açar?",
        options: [
          "Yağmur yağdığında",
          "Birisi kaldığında",
          "Dolunay çıktığında",
          "Şarkı söylediğinde"
        ]
      },
      {
        text: "Vesper hangi iksiri hazırlamayı reddeder?",
        options: [
          "Aşk iksirlerini",
          "Uyku iksirlerini",
          "Seni unutturacak bir iksiri",
          "Zehri"
        ]
      },
      {
        text: "Kael gizliden gizliye nedir?",
        options: [
          "Tilki ruhu",
          "Kuzgun",
          "Hayalet",
          "Ejderha"
        ]
      },
      {
        text: "Kaybolan gezginlerin yolunu kim aydınlatır?",
        options: [
          "Seraphine",
          "Lyra",
          "Corvin",
          "Zarek"
        ]
      },
      {
        text: "Orin yaptığı bir şakadan sonra daima geriye ne bırakır?",
        options: [
          "Bir hediye",
          "Bir bilmece",
          "Bir tüy",
          "Hiçbir şey"
        ]
      },
      {
        text: "Her devriyeden sonra sana kim rapor yazar?",
        options: [
          "Corvin",
          "Zarek",
          "Sör Rhys",
          "Castor"
        ]
      },
      {
        text: "Corvin kayalığında ne besler?",
        options: [
          "Kurtlar",
          "Güller",
          "Fenerler",
          "Kuzgunlar"
        ]
      }
    ],
    dateRounds: [
      {
        line: "{place} üzerindeki gökyüzünde bir kayan yıldız süzülüyor. {name} bir anda donakalıyor. \"Bir dilek tut. Çabuk.\"",
        choices: [
          {
            text: "Dileğini yüksek sesle onun için tut.",
            reply: "\"Sesli söylenmemesi gerekiyordu.\" Yine de yüzünde bir gülümseme beliriyor."
          },
          {
            text: "Gözlerini kapat ve dileğini bir sır olarak sakla.",
            reply: "\"Sakla onu,\" diye fısıldıyor {name}. \"Gerçek olmasını sağlayacağım.\""
          },
          {
            text: "\"Ben dileklere inanmam.\"",
            reply: "\"O zaman ikimizin yerine ben dilerim,\" diyor."
          }
        ]
      },
      {
        line: "{place} yakınlarında bir yerlerde eski bir fener sönüveriyor. {name} pelerinini sana uzatıyor.",
        choices: [
          {
            text: "Pelerini paylaş.",
            reply: "İki kişiye yetecek kadar geniş. Kıl payı da olsa. İkiniz de hiç şikayetçi değilsiniz."
          },
          {
            text: "Feneri tekrar yak.",
            reply: "\"Beni şaşırtmaya devam ediyorsun, ey gezgin.\" Işık yeniden canlanıyor."
          },
          {
            text: "\"Ben üşümüyorum.\"",
            reply: "\"Yalancı,\" diyor {name} ve yine de pelerini omuzlarına sarıyor."
          }
        ]
      }
    ]
  },
  neon: {
    intro: "Ses provası! NEON TIDE hakkında beş soru. Dördünü doğru bil, sahne çerçevesi senin olsun. Baskı yok. Tamam, belki birazcık.",
    right: [
      "Evet! Gerçek bir hayransın.",
      "Doğru! Bir şarkı daha (bis)!",
      "Aynen öyle. Hayran kulübüne üye misin yoksa?"
    ],
    wrong: [
      "Ritim kaçtı! Doğru cevap {answer}.",
      "Yok artık, {answer}. Menajerimize bunu söylediğimi anlatma sakın.",
      "Çok yaklaştın ama cevap {answer}. Biraz daha prova yapıp geri gel."
    ],
    match: [
      "Aynı cevap! Tam bir düet enerjisi.",
      "Son nakarat gibi kusursuz bir uyum.",
      "Aynıyız. Bunu bir şarkıya yazıyorum mutlaka."
    ],
    differ: [
      "Ben {answer} seçtim. Çok garip bir ikili olurduk. Bayıldım.",
      "Benim tercihim {answer}. Farklı bir ton ama aynı şarkı.",
      "Ben {answer} dedim. Konserden sonra bana nedenini anlatırsın."
    ],
    frame: {
      caption: "bis"
    },
    selfQuiz: [
      {
        text: "Sahneye çıkmadan hemen önce ne yaparım?",
        options: [
          "Dua ederim",
          "Şeker yerim",
          "Sana mesaj atarım",
          "İçten içe paniklerim"
        ]
      },
      {
        text: "Konserden sonra en sevdiğim şey?",
        options: [
          "Uyumak",
          "Gece geç saatte erişte yemek",
          "Hayran mektuplarını okumak",
          "Seni aramak"
        ]
      },
      {
        text: "Sürekli mırıldandığım o şarkı hangisi?",
        options: [
          "Çıkış şarkımız",
          "Henüz kimsenin duymadığı bir şarkı",
          "Bir ninni",
          "Senin zil sesin"
        ]
      },
      {
        text: "Yoğun programlarda en nefret ettiğim şey?",
        options: [
          "Sabah erken çekimler",
          "Sana hiç vakit ayıramamak",
          "Havalimanı yemekleri",
          "Hiçbir şey, çalışmaya bayılıyorum"
        ]
      },
      {
        text: "Gizli yeteneğim?",
        options: [
          "Yemek yapmak",
          "Çizim yapmak",
          "Her yerde uyuyakalmak",
          "Attığın her mesajı hatırlamak"
        ]
      },
      {
        text: "Kameralardan kaçmak için nereye saklanırdım?",
        options: [
          "Prova odasına",
          "Küçücük bir kafeye",
          "Çatıya",
          "Senin yanına"
        ]
      },
      {
        text: "Beni en çok ne gerer?",
        options: [
          "Canlı yayın",
          "Sessizlik",
          "Bazen sen",
          "Hiçbir şey"
        ]
      }
    ],
    quiz: [
      {
        text: "NEON TIDE’ın ana vokali kim?",
        options: [
          "Ezra",
          "Seren",
          "Kiro",
          "Haze"
        ]
      },
      {
        text: "En gençleri, yani grubun maknaesi kim?",
        options: [
          "Rio",
          "Minu",
          "Haze",
          "Kiro"
        ]
      },
      {
        text: "Gece saat 3'te sana yayınlanmamış ritimler atan kim?",
        options: [
          "Dex",
          "Juno",
          "Ari",
          "Ezra"
        ]
      },
      {
        text: "Stüdyonun ışıkları kapanana kadar prova yapan kim?",
        options: [
          "Seren",
          "Kiro",
          "Rio",
          "Cass"
        ]
      },
      {
        text: "Cass hangi grubun lideri?",
        options: [
          "NEON TIDE",
          "PRISM",
          "TIDEWAVE",
          "ECHO"
        ]
      },
      {
        text: "Juno yanında kaç telefon taşır?",
        options: [
          "Bir",
          "İki",
          "Üç",
          "Dört"
        ]
      },
      {
        text: "Koreograf Ari kaçlı sayarak prova yaptırır?",
        options: [
          "Dörtlü",
          "Altılı",
          "Sekizli",
          "Onlu"
        ]
      },
      {
        text: "Işıklar kapandığında biraz kaybolmuş hisseden kim?",
        options: [
          "Ezra",
          "Minu",
          "Dex",
          "Haze"
        ]
      }
    ],
    dateRounds: [
      {
        line: "{place} mekanında biri {name} kişisini tanıyor. \"Bu... NEON TIDE grubundan değil mi?\" {name} şapkasını hemen aşağı çekiyor.",
        choices: [
          {
            text: "Onu hemen bir ara sokağa çek.",
            reply: "\"Benim kahramanım.\" Nefes nefese gülüyor, elini hâlâ bırakmamış."
          },
          {
            text: "\"Yok canım, sadece ona benziyor.\"",
            reply: "{name} çok ciddi bir ifadeyle başını sallıyor. Hayran pek ikna olmuş görünmüyor."
          },
          {
            text: "Hayrandan ikinizin fotoğrafını çekmesini iste.",
            reply: "\"Başımı büyük belaya sokacaksın.\" Yine de hemen poza giriyor."
          }
        ]
      },
      {
        line: "{place} mekanında bir NEON TIDE şarkısı çalmaya başlıyor. {name} kıpkırmızı kesiliyor.",
        choices: [
          {
            text: "Avazın çıktığı kadar şarkıya eşlik et.",
            reply: "\"Lütfen dur. Hayır durma, devam et.\" Gülmekten kırılıyor."
          },
          {
            text: "\"Bu senin kısmın mı?\"",
            reply: "\"...Evet. Bana öyle bakma sakın.\" Sen ona bakmaya devam ediyorsun."
          },
          {
            text: "Şarkıyı daha önce hiç duymamış gibi davran.",
            reply: "\"Vay canına. Kalbimi kırdın ama.\" Kırılmış gibi yapıyor. Çoğunlukla."
          }
        ]
      }
    ]
  },
  tidepool: {
    intro: "Sipariş hazır! Kafe ve sokağımız hakkında beş soru. Dördünü bil, kafe çerçevesi müesseseden ikram.",
    right: [
      "Doğru! Bir kurabiyeyi hak ettin.",
      "Evet! Artık tam bir müdavimsin.",
      "Harika. Sol seninle gurur duyardı."
    ],
    wrong: [
      "Pek değil. Doğru cevap {answer}. Bir kahve iyi gelir.",
      "Hayır, cevap {answer}. Tezgaha sorsan herkes bilirdi.",
      "Çok yaklaştın. {answer}. Bir dahaki sefere bileceksin."
    ],
    match: [
      "Aynısı! O zaman her zamankinden iki tane.",
      "Aynıyız. Hemen Sol'a söylemeliyim.",
      "Şu halimize bak. Köşe masadaki o yaşlı çiftler gibiyiz."
    ],
    differ: [
      "Ben {answer} seçtim. Kahve eşliğinde tartışalım mı?",
      "Benim tercihim {answer}. Kruvasan yerken seninkini anlat bana.",
      "Ben {answer} dedim. Farklı siparişler, ama aynı masa."
    ],
    frame: {
      caption: "iki latte"
    },
    selfQuiz: [
      {
        text: "Her zamanki siparişim?",
        options: [
          "Sade kahve",
          "Bol şekerli",
          "Her zaman çay",
          "Sen ne içiyorsan aynısı"
        ]
      },
      {
        text: "Yağmurlu bir tatil gününde ne yaparım?",
        options: [
          "Uyurum",
          "Kafede kitap okurum",
          "Bir şeyleri tamir ederim",
          "Seni ararım"
        ]
      },
      {
        text: "Geceleri uykumu ne kaçırır?",
        options: [
          "İşler",
          "Hiçbir şey, mışıl mışıl uyurum",
          "Seni düşünmek",
          "Açıkçası fazla kahve"
        ]
      },
      {
        text: "Kafede en sevdiğim zaman dilimi?",
        options: [
          "Açılış saati",
          "Sessiz öğleden sonraları",
          "Kapanış saati",
          "Senin kapıdan girdiğin an"
        ]
      },
      {
        text: "Neyi her zaman unuturum?",
        options: [
          "Anahtarlarımı",
          "Yemek yemeyi",
          "Doğum günlerini",
          "Seninle ilgili hiçbir şeyi"
        ]
      },
      {
        text: "Moralimi en çok düzelten yemek?",
        options: [
          "Çorba",
          "Kruvasan",
          "Hazır erişte",
          "Senin pişirdiğin her şey"
        ]
      },
      {
        text: "Önemsediğimi nasıl gösteririm?",
        options: [
          "Bozulan şeyleri tamir ederek",
          "Yiyecek bir şeyler getirerek",
          "Detayları aklımda tutarak",
          "Sadece yanında kalarak"
        ]
      }
    ],
    quiz: [
      {
        text: "Tidepool Kafe’nin sahibi kim?",
        options: [
          "Sol",
          "Ivy",
          "Nadia",
          "Ren"
        ]
      },
      {
        text: "Sabahın ilk taze kruvasanını senin için kim saklar?",
        options: [
          "Marco",
          "Ren",
          "Hugo",
          "Gideon"
        ]
      },
      {
        text: "Marco her zaman iki kahve söyler ve...",
        options: [
          "İkisini de içer",
          "Birini döker",
          "Birini birine hediye eder",
          "Birini unutur"
        ]
      },
      {
        text: "Her hafta barınaktan farklı bir köpek getiren kim?",
        options: [
          "Cole",
          "Lucas",
          "Adrian",
          "Hugo"
        ]
      },
      {
        text: "Acil serviste gece nöbetleri tutan kim?",
        options: [
          "Dr. Lucas Hale",
          "Nadia",
          "Gideon",
          "Cole"
        ]
      },
      {
        text: "Ivy çantana gizlice ne bırakır?",
        options: [
          "Bir not",
          "Bir çiçek",
          "Bir kurabiye",
          "Bir anahtar"
        ]
      },
      {
        text: "Kafenin eski skuterini ücretsiz tamir eden kim?",
        options: [
          "Marco",
          "Adrian",
          "Cole",
          "Ren"
        ]
      },
      {
        text: "Adrian konsantre olduğunda ne yapar?",
        options: [
          "Islık çalar",
          "Masaya parmaklarıyla vurur",
          "Kalemini ısırır",
          "Mırıldanır"
        ]
      }
    ],
    dateRounds: [
      {
        line: "Kafenin radyosunda {place} mekanında eski bir parça çalıyor. {name} ikinci fincanı sana doğru uzatıyor. \"Senin için söyledim.\"",
        choices: [
          {
            text: "\"Siparişimi hatırlamışsın.\"",
            reply: "\"Seninle ilgili her şeyi hatırlıyorum. Bu ciddi bir sorun haline geldi artık.\""
          },
          {
            text: "Fincanları onunla değiştir.",
            reply: "\"Hey!\" Seninkini tadıyor ve komik bir yüz ifadesi takınıyor. Gülüyorsun."
          },
          {
            text: "\"Canım başka bir şey istiyordu.\"",
            reply: "\"Bir dahaki sefere o zaman.\" Hemen bir peçeteye not alıyor."
          }
        ]
      },
      {
        line: "Barınaktan kurtarılan bir köpek {place} mekanına doğru sokuluyor ve {name} ayağının üzerine oturuyor.",
        choices: [
          {
            text: "Köpeğe birlikte bir isim koyun.",
            reply: "On dakika tartışıyorsunuz. Köpeğin umurunda bile değil. Kusursuz an."
          },
          {
            text: "Çöreğinin son lokmasını ona ver.",
            reply: "\"Artık peşimizi asla bırakmaz,\" diyor {name}, keyifle gülerek."
          },
          {
            text: "Onu uzaklaştır.",
            reply: "\"Çok kabasın,\" diyor {name} sana ve köpeğin kulaklarını okşuyor."
          }
        ]
      }
    ]
  }
};
