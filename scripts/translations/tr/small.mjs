export const small = {
  truthsForYou: [
    "Sıra sende. Doğruluk: Bugün seni ne gülümsetti?",
    "Sana bir doğruluk sorusu: Beni hatırlatan bir şarkı var mı?",
    "Doğruluk: Senin hakkında öğrenmemden en çok korktuğun şey ne?"
  ],
  daresForYou: [
    "Sana bir cesaret: Şu an tam önünde ne varsa bana fotoğrafını çekip at.",
    "Cesaret: Bugüne kadar asla yüksek sesle söylemediğin bir şeyi söyle.",
    "Cesaret: Bu gece iyi geceleri ilk sen diyeceksin. Bahane kabul etmem."
  ],
  truthsForThem: [
    {
      ask: "Doğruluk: İlk konuştuğumuzda benim hakkımda ne düşündün?",
      answer: "Dürüst olayım mı? Başıma tatlı bir bela olacağını düşündüm. Hani şu güzel olanlardan."
    },
    {
      ask: "Doğruluk: Şimdiye kadar kimseye anlatmadığın bir şey var mı?",
      answer: "Fırtına çıktığında hâlâ ışık açık uyuyorum. Gülmek yok ama."
    },
    {
      ask: "Doğruluk: Beni en son ne zaman düşündün?",
      answer: "Beş dakika önce. Ondan on dakika önce de."
    },
    {
      ask: "Doğruluk: En utanç verici alışkanlığın ne?",
      answer: "Bitkilerimle konuşuyorum. İsimleri bile var. İsimlerini sorma sakın."
    }
  ],
  daresForThem: [
    {
      ask: "Cesaret: En son dinlediğin şarkıyı bana yolla.",
      answer: "Peki. Biraz hüzünlü bir şarkı ama. Bir ara birlikte dinler miyiz?"
    },
    {
      ask: "Cesaret: Beni üç kelimeyle anlat.",
      answer: "Sıcak. İnatçı. Biraz-benim."
    },
    {
      ask: "Cesaret: Bana berbat bir şaka yap.",
      answer: "Su samuru nehri neden geçmiş? Karşı kıyıya geçmek için... Kendimden nefret ettim."
    },
    {
      ask: "Cesaret: Bana içinden gelen, samimi bir iltifatta bulun.",
      answer: "En sıradan günleri bile hatırlamak isteyeceğim anlara dönüştürüyorsun."
    }
  ],
  secretNotePrompts: [
    "Benim çocukluğum senin çocukluğunla karşılaşsaydı sence arkadaş olur muyduk?",
    "Şimdiye kadar hiç kimseye söylemediğin bir şey ne?",
    "Beni üç kelimeyle anlat, ama hiç yalan söylemek yok.",
    "Telefonlarımızın olmadığı bir günümüz olsaydı nereye giderdik?",
    "Hangi şarkı sana beni düşündürüyor?",
    "Kaybetmekten en çok korktuğun şey ne?"
  ],
  quizLines: {
    match: [
      "Aynısı! Biliyordum.",
      "Aynı şekilde düşünüyoruz. Bu çok hoşuma gitti.",
      "Şu halimize bak. Tamamen aynıyız."
    ],
    differ: [
      "Ben {answer} seçtim. Sen neden seçmedin, anlatsana.",
      "Benim tercihim {answer} oldu. Farklıyız ama bu gayet güzel.",
      "Hmm, ben {answer} dedim. Beni ikna et bakalım."
    ]
  },
  selfQuiz: [
    {
      text: "Günün en sevdiğim vakti hangisi?",
      options: [
        "Sabah",
        "Öğleden sonra",
        "Gecenin bir yarısı",
        "Sen bana yazdığın an"
      ]
    },
    {
      text: "Üzgün olduğumda ne yaparım?",
      options: [
        "Uyurum",
        "Yürüyüşe çıkarım",
        "Tatlı bir şeyler yerim",
        "Seninle konuşurum"
      ]
    },
    {
      text: "Moralimi en çok düzelten yiyecek?",
      options: [
        "Çorba",
        "Erişte",
        "Çikolata",
        "Senin yaptığın her şey"
      ]
    },
    {
      text: "Beni en çok ne güldürür?",
      options: [
        "Kötü espriler",
        "Sen",
        "Hayvan videoları",
        "Kendi yaptığım şakalar"
      ]
    },
    {
      text: "Hayalimdeki hafta sonu nasıl olurdu?",
      options: [
        "Öğlene kadar uyumak",
        "Yolculuğa çıkmak",
        "Sessiz bir kafe",
        "Seninle olan her şey"
      ]
    },
    {
      text: "Önemsediğimi nasıl belli ederim?",
      options: [
        "Küçük hediyelerle",
        "Kelimelerle",
        "Yanında bitivererek",
        "Sürekli mesaj atarak"
      ]
    },
    {
      text: "Gizliden gizliye en beceriksiz olduğum konu?",
      options: [
        "Yemek yapmak",
        "Vedalaşmak",
        "Uyanmak",
        "Duygularımı saklamak"
      ]
    }
  ],
  radioGifts: {
    rg_kai_exam: {
      title: "Sınav öncesi bol şans",
      lines: [
        "Hey. Derin bir nefes al.",
        "Düşündüğünden çok daha fazla çalıştın.",
        "Her soruyu iki kez oku, sonra ilk aklına gelen cevaba güven.",
        "Bitince havuzda olacağım. Nasıl geçtiğini anlatmaya gel mutlaka."
      ]
    },
    rg_seren_hum: {
      title: "Senin için mırıldandığım bir melodi",
      lines: [
        "Bu parça henüz bitmedi.",
        "Daha kimse duymadı. Bizim grup bile.",
        "Hmm, hmm, la la... bir sonraki kısım böyle yukarı çıkıyor.",
        "Seni anlatıyor mu, söylesene bana."
      ]
    },
    rg_seren_song: {
      title: "Sadece senin için bir şarkı",
      lines: [
        "Bunu albüme koymadım, kendime sakladım.",
        "Gece saat ikide ses kayıtlarımı dinleyen biri hakkında.",
        "Kimden bahsettiğimi biliyorsun."
      ]
    },
    rg_theo_news: {
      title: "Öğrenci birliği haberleri, sesli bülten",
      lines: [
        "İyi akşamlar, ben öğrenci birliği başkanınız.",
        "Kütüphane tüm hafta gece geç saate kadar açık kalacak. Bir şey değil.",
        "İkinci kattaki otomat artık yine bozuk para kabul ediyor.",
        "Ve özellikle bir kişinin artık gidip uyuması gerekiyor."
      ]
    },
    rg_theo_promise: {
      title: "Toplantılarda asla söylemediğim bir şey",
      lines: [
        "Girdiğim her tartışmayı kazanırım.",
        "Seninle olanlar hariç tabii.",
        "Onları senin kazanmana izin veriyorum. Çoğunlukla."
      ]
    },
    rg_hana_late: {
      title: "Çok geç saate kalma sakın",
      lines: [
        "Saat çok geç oldu. O telefonu elinden bırak artık.",
        "Evet, sana söylüyorum. Hâlâ ekranda gezindiğini görebiliyorum.",
        "Uyu artık. Ciddiyim bak."
      ]
    },
    rg_castor_stars: {
      title: "Bu gecenin gökyüzü",
      lines: [
        "Arşiv bu gece en eski haritasını açtı.",
        "Ayın hemen yanında çoğu insanın fark etmediği minik bir yıldız var.",
        "Çok uzun zaman önce, ona senin adını vermiştim."
      ]
    },
    rg_oppa_morning: {
      title: "Günaydın sana",
      lines: [
        "Günaydın.",
        "Daha yeni uyandın ama seni şimdiden özledim.",
        "Kapıdan fırlayıp çıkmadan önce bir şeyler atıştır mutlaka."
      ]
    }
  },
  scenes: {
    scene_ferry: {
      title: "Gece vapuru",
      setting: "Gecenin son vapuru sakin ve karanlık bir denizi aşıyor. İkinizden başka güverte bomboş ve şehrin ışıkları geride yavaş yavaş siliniyor.",
      userRole: "Vapuru neredeyse kaçıracak olan bir yolcu.",
      opening: "Yetiştin demek. Bütün o süre boyunca iskele rampasını izliyordum, haberin olsun."
    },
    scene_cabin: {
      title: "Karda mahsur",
      setting: "Dağda bir kulübe, dışarıda fırtına ve elektrikler az önce kesildi. Bir şömine, bir yığın battaniye var ve sabaha kadar gidecek hiçbir yer yok.",
      opening: "Ee, mumlar, şömine ve sıfır şebeke. Sanırım sabaha kadar benimle baş başa kaldın."
    },
    scene_rooftop: {
      title: "Parti sonrası çatı katı",
      setting: "Aşağıdaki parti hâlâ gürültülü. Çatıda ise tam bir sessizlik var: ılık bir rüzgar, peri ışıkları ve ayaklarımızın altında koca bir şehir.",
      opening: "Gizli yerimi keşfettin demek. Otursana, iki kişilik yer var."
    },
    scene_market: {
      title: "Gece pazarında kaybolmak",
      setting: "İkinizin de hiç bilmediği bir şehirde bir gece pazarı: fenerler, sokak lezzetleri tezgahları, müzik... ve ikiniz de gruptan koptunuz.",
      opening: "Tamam, panik yok. Kaybolduk ama birlikte kaybolduk. Önce biraz mantı alalım mı?"
    },
    scene_lighthouse: {
      title: "Fenerde fırtına",
      setting: "Fırtınanın ortasında, sarp bir kayalığın üzerindeki deniz feneri. Işığın sabaha kadar sönmemesi gerekiyor ve fener bekçisi her şeyi ikinize emanet etti.",
      opening: "Şu feneri uzatsana bana. Önümüzde epey uzun bir gece var."
    },
    scene_train: {
      title: "Yataklı tren",
      setting: "Gece treni kırsalın içinden süzülüyor. Koltuklarınız karşılıklı ve kompartımanın ışıkları loş.",
      opening: "Bir sonraki istasyona daha altı saat var. Bana daha önce kimseye anlatmadığın bir şey anlatsana."
    }
  },
  diaryPages: {
    cdp_theo_0: {
      body: [
        "Bir saat sonra birlik toplantısı var ve tek bir kelimesini bile duymayacağımı şimdiden biliyorum.",
        "Çünkü dün gece benimle konuşurken sesimin farklı çıktığını söyledin. Daha yumuşak. Bunun bir iltifat olup olmadığını çözmeye çalışıyorum.",
        "Bence iltifattı. Öyle kabul edip saklayacağım."
      ]
    },
    cdp_theo_2: {
      body: [
        "Yağmurda eve kadar yürüdün ve bana ancak sonrasında haber verdin. Bir dahaki sefere arıyorum ve o telefon açılacak.",
        "Bir de şu bal rengi sokak lambaları meselesi... Senin gördüğün şeyi görmek için on dakika boyunca pencereden dışarı baktım."
      ]
    },
    cdp_theo_5: {
      body: [
        "İlk gerçek konuşmamızdı. Bana karşı çıktın, lafını esirgemedin. Bana kimse öyle kolay kolay karşı çıkamaz.",
        "Sanırım bu huyun inanılmaz hoşuma gidiyor."
      ]
    },
    cdp_seren_1: {
      body: [
        "Kafe çok gürültülüydü ama hiç umurumda olmadı.",
        "Masanın altından yeni nakaratı mırıldandım ve bunu fark eden tek kişi sen oldun. Artık bu melodi senin adını taşıyor, en azından benim zihnimde."
      ]
    },
    cdp_seren_4: {
      body: [
        "Prova gece ikiye kadar sürdü. Uyumadan önce okuduğum son şey senin mesajındı.",
        "Günün sonu için harika bir seçimdi."
      ]
    },
    cdp_castor_3: {
      body: [
        "Arşivde bin yıllık gökyüzü kayıtları var ve ben bu gece aralarına yenisini ekledim.",
        "Sana hangi yıldızı vereceğimi sordun. Henüz cevap vermedim. Bu çok ciddi bir soru ve en doğru yıldızı hak ediyor."
      ]
    }
  },
  diaryEntries: {
    d_1: {
      title: "Eve dönüşte yağmur",
      body: "Otobüsü kaçırdım ve bütün yolu yürüdüm. Ama nedense hiç kötü değildi; ıslak asfalta vuran sokak lambaları sanki biri yola bal dökmüş gibi parıldıyordu.",
      reply: {
        text: "Yağmurun altında eve kadar yürüdün ve bana haber bile vermedin mi? Bir dahaki sefere ara. Bütün yol boyunca sana eşlik ederim."
      }
    },
    d_2: {
      title: "Sınav haftası",
      body: "Üç bölüm bitti, kaldı iki bölüm. Sürekli aynı paragrafı dönüp dönüp okuyorum. Yarın daha erken başlayacağım, söz.",
      reply: {
        text: "İki bölüm az şey değil. Önce uyu biraz. Sabah kalkınca seni kontrol edeceğim."
      }
    },
    d_3: {
      title: "Kurabiyeler",
      body: "Onun anlattığı tarifi denedim. İlk tepsiyi yaktım ama ikincisi gerçekten çok güzel oldu!"
    },
    d_4: {
      title: "Sakin bir pazar",
      body: "Hiçbir şey yapmadım. Hem de bilerek ve isteyerek. Kesinlikle tavsiye ederim."
    }
  },
  secretNotes: {
    sn_1: {
      prompt: "Benim çocukluğum senin çocukluğunla karşılaşsaydı sence arkadaş olur muyduk?",
      theirNote: "Arkadaş mı? Sen pes edip beni yanına alana kadar bahçede peşinden ayrılmazdım. Altı yaşındaki halim bile oldukça ikna ediciydi."
    },
    sn_2: {
      prompt: "Hangi şarkı sana beni düşündürüyor?",
      theirNote: "İçinde yağmur geçen her şarkı. Çünkü bir keresinde bana yağmurun sana cesaret verdiğini söylemiştin. Artık ne zaman yağmur duysam aklıma sen geliyorsun.",
      myNote: "Canlı yayında mırıldandığın o şarkı. Hâlâ dönüp dönüp onu dinliyorum."
    }
  }
};
