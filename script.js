(() => {
  const PRICE = 10.90;
  const modal = document.getElementById("orderModal");
  const form = document.getElementById("orderForm");
  const success = document.getElementById("orderSuccess");
  const meal = document.getElementById("meal");
  const pickup = document.getElementById("pickup");
  const quantity = document.getElementById("quantity");
  const total = document.getElementById("orderTotal");
  const mealDays = document.getElementById("mealDays");
  const error = document.getElementById("formError");

  const availability = {
    "Paistetut muikut perunamuussilla": [1,3,5], // ma, ke, pe
    "Jauhelihapihvit perunamuusilla": [2,4,6]    // ti, to, la
  };
  const dayText = {
    "Paistetut muikut perunamuussilla": "Saatavilla ma, ke ja pe.",
    "Jauhelihapihvit perunamuusilla": "Saatavilla ti, to ja la."
  };

  function pad(n){ return String(n).padStart(2,"0"); }
  function localValue(d){
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function minimumPickup(){
    const exactMinimum = new Date(Date.now() + 60 * 60 * 1000);
    exactMinimum.setSeconds(0, 0);

    // Pyöristetään ylöspäin seuraavaan 5 minuuttiin.
    // Näin valittava aika ei voi koskaan olla alle tuntia nykyhetkestä.
    const minutes = exactMinimum.getMinutes();
    const remainder = minutes % 5;
    if (remainder !== 0) {
      exactMinimum.setMinutes(minutes + (5 - remainder));
    }
    return exactMinimum;
  }
  function refreshRules(){
    pickup.min = localValue(minimumPickup());
    mealDays.textContent = dayText[meal.value] || "";
    total.textContent = (PRICE * Math.max(1, Number(quantity.value)||1)).toFixed(2).replace(".",",") + " €";
  }
  function validatePickup(){
    error.textContent = "";
    if(!pickup.value) return false;
    const chosen = new Date(pickup.value);
    if(chosen < minimumPickup()){
      error.textContent = "Valitse noutoaika vähintään tunnin päähän.";
      return false;
    }
    const allowed = availability[meal.value] || [];
    if(!allowed.includes(chosen.getDay())){
      error.textContent = meal.value.startsWith("Paistetut") ?
        "Muikkuannos on saatavilla maanantaisin, keskiviikkoisin ja perjantaisin." :
        "Pihviannos on saatavilla tiistaisin, torstaisin ja lauantaisin.";
      return false;
    }
    return true;
  }

  document.querySelectorAll(".order-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      meal.value = btn.dataset.meal;
      form.hidden = false;
      success.hidden = true;
      form.reset();
      meal.value = btn.dataset.meal;
      quantity.value = 1;
      refreshRules();
      modal.classList.add("open");
      modal.setAttribute("aria-hidden","false");
      document.body.classList.add("modal-open");
    });
  });

  document.querySelectorAll("[data-close-order]").forEach(el => el.addEventListener("click", () => {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden","true");
    document.body.classList.remove("modal-open");
  }));

  meal.addEventListener("change", refreshRules);
  quantity.addEventListener("input", refreshRules);
  pickup.addEventListener("change", validatePickup);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if(!form.reportValidity() || !validatePickup()) return;

    error.textContent = "";
    const submitButton = form.querySelector('.submit-order[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Lähetetään...";

    const data = Object.fromEntries(new FormData(form).entries());
    const mealKey = data.meal === "Paistetut muikut perunamuussilla" ? "muikut" :
                    data.meal === "Jauhelihapihvit perunamuusilla" ? "pihvit" : "";

    const order = {
      meal: mealKey,
      quantity: Number(data.quantity),
      pickup_time: data.pickup,
      customer_name: data.customerName,
      phone: data.phone,
      email: data.email,
      address: data.address
    };

    try {
      const response = await fetch("https://katariinan-tupa-orders.cubergames.workers.dev/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order)
      });

      let result = {};
      try { result = await response.json(); } catch (_) {}

      if (!response.ok) {
        throw new Error(result.error || "Tilauksen lähetys epäonnistui. Yritä uudelleen.");
      }

      localStorage.setItem("katariinanTupaLatestOrder", JSON.stringify({
        ...order,
        orderId: result.orderId || "",
        createdAt: new Date().toISOString()
      }));

      form.hidden = true;
      success.hidden = false;
    } catch (err) {
      error.textContent = err && err.message ? err.message : "Tilauksen lähetys epäonnistui. Yritä uudelleen.";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  });


  setInterval(() => {
    if (modal.classList.contains("open")) {
      pickup.min = localValue(minimumPickup());
      if (pickup.value && new Date(pickup.value) < minimumPickup()) {
        pickup.value = "";
      }
    }
  }, 30000);

  refreshRules();
})();