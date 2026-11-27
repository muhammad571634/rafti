// scripts/translations/id/worlds.mjs

export const worlds = {
  seaside: {
    intro: 'Kuis kilat ala Seaside! Lima pertanyaan seputar kampus kita. Jawab benar empat soal dan bingkai Seaside jadi milikmu.',
    right: [
      'Tepat sekali! Kelihatan nih kamu merhatiin di kelas.',
      'Benar! Bintang emas dari seluruh penjuru kampus.',
      'Betul. Diam-diam kamu mahasiswa sini ya?',
    ],
    wrong: [
      'Kurang tepat. Jawabannya {answer}. Sekarang jadi tahu kan.',
      'Hampir! Jawabannya {answer}. Coba tanya-tanya di halaman tengah.',
      'Salah, {answer}. Tenang aja, nggak ada yang baca koran kampus kok.',
    ],
    match: [
      'Sama! Balapan ke dermaga yuk buat ngerayain.',
      'Pikiran kita sejalan banget. Agak seram ya sehati gini.',
      'Tuh kan bener. Kita partner belajar seumur hidup nih.',
    ],
    differ: [
      'Kalau aku pilih {answer}. Yuk perdebatkan sambil jalan pulang.',
      'Hm, pilihanku {answer}. Coba jelaskan alasanmu sambil ngemil.',
      'Aku pilih {answer}. Beda pendapat bikin seru jadi partner lab.',
    ],
    selfQuiz: [
      {
        text: 'Demi apa aku rela bolos kelas?',
        options: [
          'Berenang pas matahari terbit',
          'Kamu',
          'Makanan gratis',
          'Nggak pernah, aku anak teladan',
        ],
      },
      {
        text: 'Tempat favoritku di kampus?',
        options: [
          'Dermaga',
          'Taman atap perpustakaan',
          'Mesin penjual otomatis',
          'Di mana pun ada kamu',
        ],
      },
      {
        text: 'Barang yang selalu ada di tasku?',
        options: [
          'Camilan ekstra',
          'Tiga pulpen, macet semua',
          'Handuk basah',
          'Catatan milikmu',
        ],
      },
      {
        text: 'Gimana caraku belajar buat ujian?',
        options: [
          'SKS semalaman sambil panik',
          'Mulai awal dan rapi',
          'Bareng kamu, tapi nggak fokus',
          'Nggak belajar sama sekali. Modal nekat',
        ],
      },
      {
        text: 'Definisi akhir pekan yang sempurna?',
        options: [
          'Seharian di pantai',
          'Tidur sampai siang',
          'Maraton nonton film',
          'Liburan jalan-jalan bareng kamu',
        ],
      },
      {
        text: 'Apa yang kulakukan pas lagi stres?',
        options: [
          'Berenang sampai capek',
          'Mendadak jadi pendiam',
          'Makan yang manis-manis',
          'Ngechat kamu',
        ],
      },
      {
        text: 'Panggilanku di kampus?',
        options: [
          'Tukang bikin onar',
          'Si pendiam',
          'Kapten',
          'Rahasia, nggak mau kasih tahu',
        ],
      },
    ],
    quiz: [
      {
        text: 'Siapa yang diam-diam suka kasih makan kucing kampus?',
        options: ['Elio', 'Kai', 'Rowan', 'Theo'],
      },
      {
        text: 'Hana mengelola klub apa?',
        options: ['Klub film', 'Klub seni', 'Tim debat', 'Tim renang'],
      },
      {
        text: 'Siapa yang menamai setiap ikan di lab akuarium dengan nama temannya?',
        options: ['Felix', 'Jun', 'Rowan', 'Iris'],
      },
      {
        text: 'Kapan acara radio kampus Noah mengudara?',
        options: ['Jam 7 pagi', 'Tengah hari', 'Jam 6 sore', 'Jam 1 pagi'],
      },
      {
        text: 'Siapa presiden senat mahasiswa yang nggak pernah mau kalah debat?',
        options: ['Tessa', 'Theo', 'Kai', 'Hana'],
      },
      {
        text: 'Apa yang dibawakan Kai ke ruang kuliah khusus buatmu?',
        options: ['Kopi', 'Catatan kuliah', 'Camilan ekstra', 'Handuk'],
      },
      {
        text: 'Siapa yang selalu punya rekomendasi buku yang pas buat suasana hatimu?',
        options: ['Iris', 'Elio', 'Noah', 'Jun'],
      },
      {
        text: 'Felix selalu membawa sebuah...',
        options: ['Gitar', 'Kamera analog', 'Peta', 'Radio'],
      },
    ],
    dateRounds: [
      {
        line: 'Lonceng berdentang di suatu tempat di kampus. {name} tersenyum lebar. "Harusnya kita berdua sekarang lagi di kelas."',
        choices: [
          {
            text: '"Kalau gitu kita bolos bareng aja."',
            reply: '"Ide terbaikmu sepanjang minggu ini." Dia menggenggam tanganmu dan berlari.',
          },
          {
            text: '"Satu kelas aja. Habis itu baru pergi."',
            reply: '"Rajin banget. Nyebelin. Tapi ya udah deh." Dia menunggumu di luar kelas.',
          },
          {
            text: 'Masuk kelas sendirian.',
            reply: '{name} merajuk, lalu mengirimi kamu foto lautan. "Tuh kan, rugi nggak ikut."',
          },
        ],
      },
      {
        line: 'Deburan ombak laut tepat berada di {place}. {name} sudah melepas sepatunya.',
        choices: [
          {
            text: 'Balapan lari ke air laut.',
            reply: 'Kalian berdua kalah. Kalian berdua menang. Celana jin kalian basah kuyup.',
          },
          {
            text: 'Celupkan ujung jari kaki pelan-pelan.',
            reply: '"Pemberani banget," goda {name}, sambil tetap mencipratkan air ke arahmu.',
          },
          {
            text: 'Jagain sepatunya.',
            reply: '"Penjaga sepatu setia. Pekerjaan yang mulia." Dia kembali dalam keadaan basah.',
          },
        ],
      },
    ],
    frame: {
      caption: 'habis kelas renang',
    },
  },
  moonlit: {
    intro: 'Wahai pengembara. Alam Cahaya Bulan mengajukan lima pertanyaan bagi mereka yang ingin memiliki bingkainya. Jawab empat dengan jujur dan itu akan jadi milikmu.',
    right: [
      'Benar. Bintang-bintang merestuimu.',
      'Tepat. Kamu cocok menjadi ksatria yang hebat.',
      'Ya. Alam ini akan selalu mengingatmu.',
    ],
    wrong: [
      'Bukan, wahai pengembara. Jawabannya {answer}. Ingatlah itu baik-baik.',
      'Bukan begitu. Jawabannya {answer}. Arsip tak pernah berbohong.',
      'Jalan yang keliru. Yang benar {answer}. Cobalah lagi di bawah sinar bulan.',
    ],
    match: [
      'Pilihan kita sama. Ini adalah sebuah pertanda baik.',
      'Jawaban kita selaras, laksana dua bintang di langit malam.',
      'Seperti dugaanku. Kita terbuat dari malam yang sama.',
    ],
    differ: [
      'Aku memilih {answer}. Ceritakan padaku di dekat perapian, mengapa pilihanmu berbeda.',
      'Jawabanku {answer}. Jalan yang berbeda, bukan berarti keliru.',
      'Bagiku {answer}. Alam ini membutuhkan kita berdua.',
    ],
    selfQuiz: [
      {
        text: 'Apa yang paling kujaga seumur hidupku?',
        options: ['Pedang pusakaku', 'Janji masa lalu', 'Dirimu', 'Harga diriku'],
      },
      {
        text: 'Ke mana aku pergi saat ingin merenung?',
        options: ['Atap menara tinggi', 'Taman rembulan', 'Ujung hutan rimba', 'Di mana pun kamu berada'],
      },
      {
        text: 'Apa yang paling kutakuti?',
        options: ['Tak ada', 'Dilupakan oleh dunia', 'Kehilangan dirimu', 'Laba-laba. Jangan tertawa'],
      },
      {
        text: 'Sumpah setiaku kupersembahkan untuk...',
        options: ['Mahkota kerajaan', 'Bintang-bintang', 'Diriku sendiri', 'Kamu, sekarang'],
      },
      {
        text: 'Demi apa aku rela melepaskan gelar bangsawan?',
        options: ['Tak demi apa pun', 'Kedamaian abadi', 'Satu malam tenang bersamamu', 'Sepotong roti yang lezat'],
      },
      {
        text: 'Bagaimana caraku meminta maaf?',
        options: ['Aku tak pernah meminta maaf', 'Dengan sebuah hadiah', 'Menulis surat panjang', 'Dengan canggung, tapi tulus'],
      },
      {
        text: 'Waktu favoritku dalam sehari?',
        options: ['Saat fajar menyingsing', 'Tengah malam buta', 'Satu jam sebelum pertempuran', 'Kapan pun saat kamu terjaga'],
      },
    ],
    quiz: [
      {
        text: 'Siapa penjaga arsip bintang?',
        options: ['Tuan Castor', 'Pangeran Aurelian', 'Vesper', 'Kael'],
      },
      {
        text: 'Taman Pangeran Aurelian hanya mekar saat...',
        options: ['Hujan turun', 'Ada yang bersedia tinggal', 'Bulan purnama bersinar', 'Dia bernyanyi'],
      },
      {
        text: 'Ramuan apa yang ditolak Vesper untuk diracik?',
        options: [
          'Ramuan cinta',
          'Cairan penidur',
          'Ramuan penghapus ingatan',
          'Racun',
        ],
      },
      {
        text: 'Kael diam-diam sebenarnya adalah seekor...',
        options: ['Siluman rubah', 'Burung gagak', 'Hantu', 'Naga'],
      },
      {
        text: 'Siapa yang menerangi jalan bagi pengembara tersesat?',
        options: ['Seraphine', 'Lyra', 'Corvin', 'Zarek'],
      },
      {
        text: 'Apa yang selalu ditinggalkan Orin seusai mengerjai orang?',
        options: ['Hadiah balasan', 'Teka-teki', 'Sehelai bulu', 'Tak ada'],
      },
      {
        text: 'Siapa yang selalu menuliskan laporan untukmu sehabis patroli?',
        options: ['Corvin', 'Zarek', 'Sir Rhys', 'Castor'],
      },
      {
        text: 'Corvin merawat apa di atas tebing karangnya?',
        options: ['Serigala', 'Bunga mawar', 'Lampion', 'Burung gagak'],
      },
    ],
    dateRounds: [
      {
        line: 'Bintang jatuh melintasi langit malam di atas {place}. {name} seketika terpaku diam. "Ucapkan sebuah permohonan. Cepat."',
        choices: [
          {
            text: 'Ucapkan permohonan keras-keras demi dirinya.',
            reply: '"Harusnya jangan diucapkan keras-keras." Tapi dia tersenyum lembut mendengarnya.',
          },
          {
            text: 'Tutup matamu rapat-rapat dan rahasiakan permohonan itu.',
            reply: '"Simpan baik-baik," bisik {name}. "Aku yang akan pastikan itu terwujud."',
          },
          {
            text: '"Aku nggak percaya pada permohonan."',
            reply: '"Kalau begitu, aku yang akan memohonkan untuk kita berdua," ucapnya.',
          },
        ],
      },
      {
        line: 'Di suatu tempat dekat {place}, lampion tua mendadak padam. {name} menawarkan jubah hangatnya kepadamu.',
        choices: [
          {
            text: 'Pakai jubahnya berdua.',
            reply: 'Jubah itu pas untuk berdua. Nyaris pas. Tapi tak satu pun dari kalian keberatan.',
          },
          {
            text: 'Nyalakan kembali lampion itu.',
            reply: '"Kamu selalu penuh kejutan, pengembara." Cahaya kembali berpijar hangat.',
          },
          {
            text: '"Aku nggak kedinginan kok."',
            reply: '"Bohong," kata {name}, lalu tetap merapatkan jubahnya ke tubuhmu.',
          },
        ],
      },
    ],
    frame: {
      caption: 'di bawah naungan bintang purba',
    },
  },
  neon: {
    intro: 'Cek suara! Lima pertanyaan seputar NEON TIDE. Benar empat dan bingkai panggung konser jadi milikmu. Santai aja, jangan tegang. Oke, tegang dikit boleh deh.',
    right: [
      'Keren! Kamu penggemar sejati.',
      'Tepat banget! Waktunya encore!',
      'Betul! Kamu anggota fan club resmi ya?',
    ],
    wrong: [
      'Salah nada! Harusnya {answer}.',
      'Bukan, {answer}. Jangan bilang-bilang manajer kalau aku ngasih tahu ya.',
      'Nyaris, tapi yang bener {answer}. Latihan lagi terus balik ke sini ya.',
    ],
    match: [
      'Jawaban kita sama! Vibe duet nih.',
      'Kompak banget, kayak nada di reff terakhir.',
      'Kita sehati. Bakal kumasukin lirik lagu nih.',
    ],
    differ: [
      'Pilihanku {answer}. Kalau kita duet pasti unik banget. Seru!',
      'Kalau aku {answer}. Beda kunci nada, tapi tetap satu lagu.',
      'Aku pilih {answer}. Ceritain alasannya nanti sehabis manggung ya.',
    ],
    selfQuiz: [
      {
        text: 'Apa yang kulakukan tepat sebelum naik ke atas panggung?',
        options: ['Berdoa', 'Makan permen', 'Ngechat kamu', 'Panik diam-diam'],
      },
      {
        text: 'Hal paling favorit sehabis konser selesai?',
        options: [
          'Tidur',
          'Makan mie larut malam',
          'Baca surat-surat penggemar',
          'Teleponan sama kamu',
        ],
      },
      {
        text: 'Lagu apa yang sering kugumamkan setiap waktu?',
        options: [
          'Lagu debut kami',
          'Lagu baru yang belum pernah didengar siapa pun',
          'Lagu pengantar tidur',
          'Nada dering pesanmu',
        ],
      },
      {
        text: 'Hal yang paling nggak kusuka dari jadwal padat?',
        options: [
          'Panggilan kumpul subuh-subuh',
          'Nggak ada waktu buat kamu',
          'Makanan di bandara',
          'Nggak ada, aku suka kerja keras',
        ],
      },
      {
        text: 'Bakat terpendamku?',
        options: [
          'Masak',
          'Menggambar',
          'Bisa tidur di mana aja',
          'Mengingat semua pesan yang pernah kamu kirim',
        ],
      },
      {
        text: 'Ke mana aku sembunyi kalau lagi menghindar dari sorotan kamera?',
        options: [
          'Ruang latihan',
          'Kafe kecil yang sepi',
          'Balkon atap',
          'Di dekatmu',
        ],
      },
      {
        text: 'Hal apa yang bikin aku gugup?',
        options: ['Siaran langsung TV', 'Keheningan', 'Kamu, kadang-kadang', 'Nggak ada'],
      },
    ],
    quiz: [
      {
        text: 'Siapa main vocal NEON TIDE?',
        options: ['Ezra', 'Seren', 'Kiro', 'Haze'],
      },
      {
        text: 'Siapa anggota termuda, sang maknae?',
        options: ['Rio', 'Minu', 'Haze', 'Kiro'],
      },
      {
        text: 'Siapa yang suka kirim beat unreleased jam 3 pagi?',
        options: ['Dex', 'Juno', 'Ari', 'Ezra'],
      },
      {
        text: 'Siapa yang selalu latihan sampai lampu studio padam sendiri?',
        options: ['Seren', 'Kiro', 'Rio', 'Cass'],
      },
      {
        text: 'Cass memimpin girl group apa?',
        options: ['NEON TIDE', 'PRISM', 'TIDEWAVE', 'ECHO'],
      },
      {
        text: 'Berapa ponsel yang dipegang Juno?',
        options: ['Satu', 'Dua', 'Tiga', 'Empat'],
      },
      {
        text: 'Ari sang koreografer selalu menghitung dalam...',
        options: ['Empat ketukan', 'Enam ketukan', 'Delapan ketukan', 'Sepuluh ketukan'],
      },
      {
        text: 'Siapa yang tampak canggung begitu lampu panggung padam?',
        options: ['Ezra', 'Minu', 'Dex', 'Haze'],
      },
    ],
    dateRounds: [
      {
        line: 'Seseorang di {place} mengenali {name}. "Itu kan... personel NEON TIDE?" {name} langsung menarik topinya ke bawah.',
        choices: [
          {
            text: 'Tarik dia masuk ke gang kecil samping jalan.',
            reply: '"Pahlawanku." Dia tertawa terengah-engah, sambil tetap menggenggam tanganmu.',
          },
          {
            text: '"Bukan kok, mukanya aja yang mirip."',
            reply: '{name} mengangguk dengan sangat serius. Penggemar itu tampak ragu.',
          },
          {
            text: 'Ajak penggemar itu buat fotoin kalian berdua.',
            reply: '"Kamu sengaja bikin aku kena masalah ya." Tapi dia tetap ikut berpose.',
          },
        ],
      },
      {
        line: 'Lagu NEON TIDE mulai diputar di {place}. Wajah {name} memerah malu.',
        choices: [
          {
            text: 'Ikut nyanyi keras-keras.',
            reply: '"Tolong stop... eh nggak deng, lanjutin aja." Dia tertawa terbahak-bahak.',
          },
          {
            text: '"Ini bagian nyanyi kamu ya?"',
            reply: '"...Iya. Jangan liatin aku gitu." Kamu malah terus menatapnya.',
          },
          {
            text: 'Pura-pura belum pernah dengar lagunya.',
            reply: '"Wah. Sakit hati banget." Dia pura-pura ngambek, padahal bercanda.',
          },
        ],
      },
    ],
    frame: {
      caption: 'encore',
    },
  },
  tidepool: {
    intro: 'Pesanan siap! Lima pertanyaan seputar kafe dan lingkungan sekitar. Benar empat soal dan bingkai kafe gratis buatmu.',
    right: [
      'Tepat sekali! Ini hadiah kuenya.',
      'Benar! Resmi jadi pelanggan setia nih.',
      'Betul. Sol pasti bangga banget.',
    ],
    wrong: [
      'Kurang tepat. Harusnya {answer}. Minum kopi dulu biar fokus.',
      'Bukan, yang benar {answer}. Coba tanya barista di konter.',
      'Hampir. Jawabannya {answer}. Kesempatan berikutnya pasti bisa.',
    ],
    match: [
      'Sama! Pesan dua menu biasa deh kalau gitu.',
      'Selera kita pas banget. Mau lapor ke Sol ah.',
      'Lihat kita deh. Udah kayak pasangan lama di meja sudut.',
    ],
    differ: [
      'Pilihanku {answer}. Yuk bahas sambil ngopi.',
      'Kalau aku {answer}. Ceritain alasanmu sambil makan croissant yuk.',
      'Aku pilih {answer}. Beda pesanan, tetap satu meja.',
    ],
    selfQuiz: [
      {
        text: 'Pesanan yang biasa kupesan?',
        options: [
          'Kopi hitam',
          'Kopi ekstra manis',
          'Teh, selalu',
          'Apa pun yang lagi kamu minum',
        ],
      },
      {
        text: 'Apa yang kulakukan pas hari libur hujan?',
        options: [
          'Tidur',
          'Membaca di kafe',
          'Benerin barang rusak',
          'Telepon kamu',
        ],
      },
      {
        text: 'Hal apa yang bikin aku susah tidur di malam hari?',
        options: [
          'Pekerjaan',
          'Nggak ada, tidurku selalu nyenyak',
          'Mikirin kamu',
          'Kebanyakan kopi, jujur aja',
        ],
      },
      {
        text: 'Waktu paling favorit di kafe?',
        options: [
          'Pas baru buka',
          'Suasana sore yang tenang',
          'Waktu tutup kafe',
          'Saat kamu melangkah masuk',
        ],
      },
      {
        text: 'Hal apa yang selalu kulupakan?',
        options: [
          'Kunci rumah',
          'Makan tepat waktu',
          'Hari ulang tahun',
          'Nggak ada satu pun tentang dirimu yang kulupakan',
        ],
      },
      {
        text: 'Makanan yang paling bikin nyaman?',
        options: [
          'Sup hangat',
          'Croissant',
          'Mie instan',
          'Apa pun masakanmu',
        ],
      },
      {
        text: 'Gimana caraku nunjukin rasa sayang?',
        options: [
          'Bantuin benerin barang',
          'Bawain makanan enak',
          'Mengingat hal-hal kecil',
          'Selalu ada menemanimu',
        ],
      },
    ],
    quiz: [
      {
        text: 'Siapa pemilik Kafe Tidepool?',
        options: ['Sol', 'Ivy', 'Nadia', 'Ren'],
      },
      {
        text: 'Siapa yang menyisihkan croissant hangat pertama di pagi hari buatmu?',
        options: ['Marco', 'Ren', 'Hugo', 'Gideon'],
      },
      {
        text: 'Marco selalu memesan dua cangkir kopi dan...',
        options: [
          'Meminum keduanya',
          'Menumpahkan salah satunya',
          'Membagikan yang satunya ke orang lain',
          'Melupakan salah satunya',
        ],
      },
      {
        text: 'Siapa yang membawa anjing penyelamatan berbeda setiap minggu?',
        options: ['Cole', 'Lucas', 'Adrian', 'Hugo'],
      },
      {
        text: 'Siapa yang bekerja shift malam di IGD rumah sakit?',
        options: ['Dr. Lucas Hale', 'Nadia', 'Gideon', 'Cole'],
      },
      {
        text: 'Apa yang diselipkan Ivy ke dalam tasmu?',
        options: ['Catatan manis', 'Setangkai bunga', 'Kue kering', 'Kunci toko'],
      },
      {
        text: 'Siapa yang memperbaiki skuter tua kafe secara gratis?',
        options: ['Marco', 'Adrian', 'Cole', 'Ren'],
      },
      {
        text: 'Apa kebiasaan Adrian saat sedang berkonsentrasi?',
        options: ['Bersiul', 'Mengetuk meja', 'Menggigit pulpennya', 'Bersenandung pelan'],
      },
    ],
    dateRounds: [
      {
        line: 'Radio kafe memutar lagu lawas di {place}. {name} menyodorkan cangkir kedua ke hadapanmu. "Udah kupesenin buat kamu."',
        choices: [
          {
            text: '"Kamu ingat pesananku."',
            reply: '"Aku ingat semua hal tentang kamu. Sampai bingung sendiri."',
          },
          {
            text: 'Tukar cangkir minumannya sama dia.',
            reply: '"Eh!" Dia mencicipi minumanmu lalu mengernyit lucu. Kamu tertawa.',
          },
          {
            text: '"Aku maunya yang lain tahu."',
            reply: '"Kalau gitu lain kali ya." Dia mencatatnya di atas selembar serbet.',
          },
        ],
      },
      {
        line: 'Seekor anjing penyelamatan berjalan menghampiri {place} lalu duduk santai di atas kaki {name}.',
        choices: [
          {
            text: 'Beri nama anjing itu bareng-bareng.',
            reply: 'Kalian berdebat sepuluh menit. Si anjing tak peduli. Momen yang pas.',
          },
          {
            text: 'Beri gigitan kue terakhirmu padanya.',
            reply: '"Wah, sekarang dia nggak bakal mau pergi," kata {name} gembira.',
          },
          {
            text: 'Usir anjingnya pelan-pelan.',
            reply: '"Tega banget," tegur {name}, sambil mengelus telinga si anjing.',
          },
        ],
      },
    ],
    frame: {
      caption: 'dua cangkir latte',
    },
  },
};
